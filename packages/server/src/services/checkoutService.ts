import { sumCents } from "@amanda/shared";
import { Types } from "mongoose";
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
import { getPackageForItems, quoteShipping, type ShippingItemInput } from "./shippingService.js";

export interface StockDecrement {
  product: Types.ObjectId;
  variantSku: string;
  quantity: number;
}

/**
 * Sin transacciones multi-doc: cada decremento es atómico por sí solo
 * (findOneAndUpdate con filtro de stock suficiente), y si uno falla se
 * revierten manualmente los que ya se aplicaron (sin dejar constancia en
 * el log: la venta nunca llegó a concretarse). Los movimientos reales se
 * registran recién si la orden se crea con éxito.
 */
export async function decrementStock(items: StockDecrement[]): Promise<StockChange[]> {
  const applied: StockDecrement[] = [];
  const changes: StockChange[] = [];
  try {
    for (const item of items) {
      const before = await Product.findOneAndUpdate(
        // $elemMatch: sku y stock deben cumplirse en la MISMA variante; con paths sueltos
        // podría matchear una variante y decrementar (posicional $) otra distinta.
        {
          _id: item.product,
          variants: { $elemMatch: { sku: item.variantSku, stock: { $gte: item.quantity } } },
        },
        { $inc: { "variants.$.stock": -item.quantity } },
      );
      const variant = before?.variants.find((v) => v.sku === item.variantSku);
      if (!before || !variant) {
        throw new BadRequestError(`Stock insuficiente para ${item.variantSku}`);
      }
      applied.push(item);
      changes.push({
        product: item.product.toString(),
        variantSku: item.variantSku,
        quantity: -item.quantity,
        previousStock: variant.stock,
        newStock: variant.stock - item.quantity,
      });
    }
    return changes;
  } catch (err) {
    await restockItems(applied);
    throw err;
  }
}

export async function restockItems(items: StockDecrement[]): Promise<void> {
  await Promise.all(
    items.map((item) =>
      Product.updateOne(
        { _id: item.product, "variants.sku": item.variantSku },
        { $inc: { "variants.$.stock": item.quantity } },
      ),
    ),
  );
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

  const address =
    input.shippingMethod === "home"
      ? user.addresses.find((a) => a._id.toString() === input.addressId)
      : undefined;
  if (input.shippingMethod === "home" && !address) {
    throw new NotFoundError("Dirección no encontrada");
  }

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
  const shippingOptions = await quoteShipping({
    items: shippingItems,
    subtotal,
    destinationPostalCode: address?.postalCode,
  });
  const shippingOption = shippingOptions.find((o) => o.method === input.shippingMethod);
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
  const shippingPackage =
    input.shippingMethod === "home" ? await getPackageForItems(shippingItems) : undefined;

  // El stock se descuenta ANTES de crear la orden para que la reserva sea
  // atómica ítem por ítem; si algo falla en el medio, se revierte todo sin
  // dejar constancia en el log (la venta nunca llegó a concretarse).
  const stockChanges = await decrementStock(stockDecrements);

  const orderNumber = await getNextSequence("orderNumber");

  let order: OrderDocument;
  try {
    order = await Order.create({
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
      shippingMethod: input.shippingMethod,
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
        input.shippingMethod === "home"
          ? {
              carrier: shippingOption.carrier ?? "correo_argentino",
              service: undefined,
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
    });
  } catch (err) {
    await restockItems(stockDecrements);
    throw err;
  }

  // Recién si Mercado Pago acepta crear la preferencia se considera la venta
  // concretada: se vacía el carrito y se deja constancia del movimiento de
  // stock. Si falla, se devuelve el stock y se cancela la orden sin tocar
  // el carrito, para que el cliente pueda reintentar desde cero.
  let preference: { preferenceId: string; initPoint: string };
  const deadline = getPaymentDeadline(order);
  try {
    preference = await createPaymentPreference(order, deadline);
  } catch (err) {
    await restockItems(stockDecrements);
    order.status = "cancelled";
    order.statusHistory.push({
      status: "cancelled",
      changedAt: new Date(),
      note: "No se pudo iniciar el pago con Mercado Pago",
    });
    await order.save();
    throw err;
  }

  order.paymentDetails = {
    preferenceId: preference.preferenceId,
    initPoint: preference.initPoint,
    expiresAt: deadline,
  };
  await order.save();

  await Cart.updateOne({ user: userId }, { $set: { items: [] } });
  await recordMovements(stockChanges, {
    type: "sale_out",
    reference: order._id.toString(),
    createdBy: userId,
  });

  return { order, checkoutUrl: preference.initPoint };
}
