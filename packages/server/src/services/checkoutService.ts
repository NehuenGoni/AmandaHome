import { parseShippingOptionId, sumCents } from "@amanda/shared";
import { Types, type ClientSession } from "mongoose";
import { runInTransaction } from "../config/db.js";
import { isMercadoPagoConfigured } from "../config/env.js";
import { getNextSequence } from "../models/Counter.js";
import { Cart } from "../models/Cart.js";
import { Order, type IOrderItem, type OrderDocument } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { BadRequestError, ConflictError, NotFoundError, ServiceUnavailableError } from "../utils/AppError.js";
import type { CreateCheckoutInput } from "../validators/checkoutValidators.js";
import { recordMovements, type StockChange } from "./inventoryService.js";
import { createPaymentPreference, getPaymentDeadline } from "./paymentService.js";
import { findAgency, quoteShipping, type ShippingItemInput } from "./shippingService.js";

export interface StockDecrement {
  product: Types.ObjectId;
  variantSku: string;
  quantity: number;
}

/**
 * Debe llamarse dentro de una transacción (`runInTransaction`): cada decremento
 * es atómico (findOneAndUpdate con filtro de stock suficiente) y, si uno falla,
 * el abort de la transacción revierte los que ya se aplicaron. Los movimientos
 * del log se registran en la misma transacción, recién cuando la venta se concreta.
 */
export async function decrementStock(
  items: StockDecrement[],
  session: ClientSession,
): Promise<StockChange[]> {
  const changes: StockChange[] = [];
  for (const item of items) {
    const before = await Product.findOneAndUpdate(
      // $elemMatch: sku y stock deben cumplirse en la MISMA variante; con paths sueltos
      // podría matchear una variante y decrementar (posicional $) otra distinta.
      {
        _id: item.product,
        variants: { $elemMatch: { sku: item.variantSku, stock: { $gte: item.quantity } } },
      },
      { $inc: { "variants.$.stock": -item.quantity } },
      { session },
    );
    const variant = before?.variants.find((v) => v.sku === item.variantSku);
    if (!before || !variant) {
      throw new BadRequestError(`Stock insuficiente para ${item.variantSku}`);
    }
    changes.push({
      product: item.product.toString(),
      variantSku: item.variantSku,
      quantity: -item.quantity,
      previousStock: variant.stock,
      newStock: variant.stock - item.quantity,
    });
  }
  return changes;
}

export async function restockItems(items: StockDecrement[], session: ClientSession): Promise<void> {
  for (const item of items) {
    await Product.updateOne(
      { _id: item.product, "variants.sku": item.variantSku },
      { $inc: { "variants.$.stock": item.quantity } },
      { session },
    );
  }
}

export async function createOrderFromCart(
  userId: string,
  input: CreateCheckoutInput,
): Promise<{ order: OrderDocument; checkoutUrl: string }> {
  if (!isMercadoPagoConfigured) {
    throw new ServiceUnavailableError("Mercado Pago no está configurado");
  }

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("Usuario no encontrado");

  const shippingMethod = parseShippingOptionId(input.shippingOptionId)!.method;
  const address =
    shippingMethod === "home"
      ? user.addresses.find((a) => a._id.toString() === input.addressId)
      : undefined;
  if (shippingMethod === "home" && !address) {
    throw new NotFoundError("Dirección no encontrada");
  }
  const agency =
    shippingMethod === "branch" ? await findAgency(input.provinceCode!, input.agencyCode!) : undefined;

  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    throw new BadRequestError("El carrito está vacío");
  }

  const productIds = [...new Set(cart.items.map((i) => i.product.toString()))];
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const orderItems: IOrderItem[] = [];
  const stockDecrements: StockDecrement[] = [];
  const shippingItems: ShippingItemInput[] = [];

  for (const item of cart.items) {
    const product = productById.get(item.product.toString());
    const variant = product?.variants.find((v) => v.sku === item.variantSku);
    if (!product || !variant) {
      throw new BadRequestError(`Un producto del carrito ya no está disponible (${item.variantSku})`);
    }

    orderItems.push({
      product: product._id,
      productName: product.name,
      variantSku: variant.sku,
      attributeName: variant.attributeName,
      attributeValue: variant.attributeValue,
      image: product.images[0]?.url,
      unitPrice: variant.price,
      quantity: item.quantity,
      subtotal: variant.price * item.quantity,
    });
    stockDecrements.push({ product: product._id, variantSku: variant.sku, quantity: item.quantity });
    shippingItems.push({
      weight: variant.weight,
      height: variant.height,
      width: variant.width,
      length: variant.length,
      quantity: item.quantity,
    });
  }

  const subtotal = sumCents(...orderItems.map((i) => i.subtotal));

  // Se recotiza acá (nunca se confía en `expectedShippingCost` para el cobro):
  // si el método está deshabilitado o el precio cambió desde que el cliente
  // lo vio, se corta el checkout antes de tocar stock.
  const quote = await quoteShipping({
    items: shippingItems,
    subtotal,
    destinationPostalCode: address?.postalCode,
    agency,
  });
  const shippingOption = quote.options.find((o) => o.id === input.shippingOptionId);
  if (!shippingOption) {
    throw new BadRequestError("El método de envío elegido no está disponible");
  }
  if (shippingOption.cost !== input.expectedShippingCost) {
    throw new ConflictError("El costo de envío cambió, volvé a intentar", {
      shippingCost: shippingOption.cost,
    });
  }

  const shippingCost = shippingOption.cost;
  const total = sumCents(subtotal, shippingCost);
  // Se guarda el mismo paquete usado para cotizar, para no tener que
  // recalcularlo (ni confiar en que las variantes no cambiaron) al despachar.
  const shippingPackage = shippingMethod === "pickup" ? undefined : quote.packages[shippingMethod];

  const orderNumber = await getNextSequence("orderNumber");

  // Transacción A: la reserva de stock y la creación de la orden son todo o
  // nada. Si algo falla, el abort deja el stock intacto y sin movimientos.
  const { order, stockChanges } = await runInTransaction(async (session) => {
    const changes = await decrementStock(stockDecrements, session);
    const [created] = await Order.create(
      [
        {
          orderNumber,
          customer: userId,
          items: orderItems,
          subtotal,
          shippingCost,
          total,
          status: "pending",
          statusHistory: [{ status: "pending", changedAt: new Date() }],
          paymentMethod: "mercado_pago",
          paymentStatus: "pending",
          shippingMethod,
          shippingAddress: address
            ? {
                label: address.label,
                street: address.street,
                number: address.number,
                city: address.city,
                province: address.province,
                postalCode: address.postalCode,
                country: address.country,
                phone: address.phone,
              }
            : undefined,
          shippingDetails:
            shippingMethod !== "pickup"
              ? {
                  carrier: shippingOption.carrier ?? "correo_argentino",
                  service: shippingOption.service,
                  agency: agency && {
                    code: agency.code,
                    name: agency.name,
                    address: [agency.address, agency.locality].filter(Boolean).join(", "),
                    postalCode: agency.postalCode,
                    provinceCode: agency.provinceCode,
                  },
                  etaMinDays: shippingOption.etaMinDays,
                  etaMaxDays: shippingOption.etaMaxDays,
                  quotedAt: new Date(),
                  isFallback: shippingOption.isFallback,
                  packageWeight: shippingPackage?.weight,
                  packageHeight: shippingPackage?.height,
                  packageWidth: shippingPackage?.width,
                  packageLength: shippingPackage?.length,
                }
              : undefined,
          notes: input.notes,
        },
      ],
      { session },
    );
    return { order: created!, stockChanges: changes };
  });

  // La preferencia de Mercado Pago es una llamada HTTP externa: va fuera de la
  // transacción. Si falla, se devuelve el stock y se cancela la orden sin
  // tocar el carrito (transacción C), para que el cliente pueda reintentar.
  let preference: { preferenceId: string; initPoint: string };
  const deadline = getPaymentDeadline(order);
  try {
    preference = await createPaymentPreference(order, deadline);
  } catch (err) {
    await runInTransaction(async (session) => {
      await restockItems(stockDecrements, session);
      order.status = "cancelled";
      order.statusHistory.push({
        status: "cancelled",
        changedAt: new Date(),
        note: "No se pudo iniciar el pago con Mercado Pago",
      });
      await order.save({ session });
    });
    throw err;
  }

  // Transacción B: recién acá la venta se considera concretada.
  await runInTransaction(async (session) => {
    order.paymentDetails = {
      preferenceId: preference.preferenceId,
      initPoint: preference.initPoint,
      expiresAt: deadline,
    };
    await order.save({ session });
    await Cart.updateOne({ user: userId }, { $set: { items: [] } }, { session });
    await recordMovements(
      stockChanges,
      { type: "sale_out", reference: order._id.toString(), createdBy: userId },
      session,
    );
  });

  return { order, checkoutUrl: preference.initPoint };
}
