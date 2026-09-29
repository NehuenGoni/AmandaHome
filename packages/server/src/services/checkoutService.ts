import { sumCents } from "@amanda/shared";
import { Types } from "mongoose";
import { isMercadoPagoConfigured } from "../config/env.js";
import { getNextSequence } from "../models/Counter.js";
import { Cart } from "../models/Cart.js";
import { Order, type IOrderItem, type OrderDocument } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { BadRequestError, NotFoundError, ServiceUnavailableError } from "../utils/AppError.js";
import type { CreateCheckoutInput } from "../validators/checkoutValidators.js";
import { recordMovements, type StockChange } from "./inventoryService.js";
import { createPaymentPreference, getPaymentDeadline } from "./paymentService.js";

const SHIPPING_COSTS: Record<string, number> = {
  pickup: 0,
  standard: 150000,
  express: 300000,
};

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
        { _id: item.product, "variants.sku": item.variantSku, "variants.stock": { $gte: item.quantity } },
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

  const address = user.addresses.find((a) => a._id.toString() === input.addressId);
  if (!address) throw new NotFoundError("Dirección no encontrada");

  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    throw new BadRequestError("El carrito está vacío");
  }

  const productIds = [...new Set(cart.items.map((i) => i.product.toString()))];
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const orderItems: IOrderItem[] = [];
  const stockDecrements: StockDecrement[] = [];

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
  }

  const subtotal = sumCents(...orderItems.map((i) => i.subtotal));
  const shippingCost = SHIPPING_COSTS[input.shippingMethod] ?? 0;
  const total = sumCents(subtotal, shippingCost);

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
      shippingAddress: {
        label: address.label,
        street: address.street,
        number: address.number,
        city: address.city,
        province: address.province,
        postalCode: address.postalCode,
        country: address.country,
        phone: address.phone,
      },
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
