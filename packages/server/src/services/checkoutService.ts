import { sumCents } from "@amanda/shared";
import { Types } from "mongoose";
import { getNextSequence } from "../models/Counter.js";
import { Cart } from "../models/Cart.js";
import { Order, type IOrderItem, type OrderDocument } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { BadRequestError, NotFoundError } from "../utils/AppError.js";
import type { CreateCheckoutInput } from "../validators/checkoutValidators.js";
import { createPaymentPreference } from "./paymentService.js";

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
 * revierten manualmente los que ya se aplicaron.
 */
async function decrementStock(items: StockDecrement[]): Promise<void> {
  const applied: StockDecrement[] = [];
  try {
    for (const item of items) {
      const result = await Product.findOneAndUpdate(
        { _id: item.product, "variants.sku": item.variantSku, "variants.stock": { $gte: item.quantity } },
        { $inc: { "variants.$.stock": -item.quantity } },
      );
      if (!result) {
        throw new BadRequestError(`Stock insuficiente para ${item.variantSku}`);
      }
      applied.push(item);
    }
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

  // La Order se crea en pending y el stock se descuenta ANTES de contactar
  // al gateway: si Mercado Pago falla después, la orden queda pending y el
  // stock ya reservado; el admin puede cancelarla manualmente si hace falta.
  await decrementStock(stockDecrements);

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

  await Cart.updateOne({ user: userId }, { $set: { items: [] } });

  const { preferenceId, initPoint } = await createPaymentPreference(order);
  order.paymentDetails = { preferenceId };
  await order.save();

  return { order, checkoutUrl: initPoint };
}
