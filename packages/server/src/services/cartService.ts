import { Types } from "mongoose";
import { Cart, type CartDocument, type ICartItem } from "../models/Cart.js";
import { Product, type IProductVariant } from "../models/Product.js";
import { BadRequestError, NotFoundError } from "../utils/AppError.js";
import type { AddCartItemInput, MergeCartInput } from "../validators/cartValidators.js";

export interface EnrichedCartItem {
  productId: string;
  name: string;
  slug: string;
  image?: string;
  variantSku: string;
  attributeName: string;
  attributeValue: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  availableStock: number;
}

export interface EnrichedCart {
  items: EnrichedCartItem[];
  subtotal: number;
}

async function getOrCreateCart(userId: string): Promise<CartDocument> {
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { new: true, upsert: true },
  );
  return cart;
}

/**
 * Un producto puede volverse inactivo o perder una variante después de
 * agregarse al carrito; acá se descartan esos items huérfanos y se
 * persiste la limpieza para no arrastrarlos.
 */
async function enrichCart(cart: CartDocument): Promise<EnrichedCart> {
  const productIds = [...new Set(cart.items.map((item) => item.product.toString()))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const validItems: ICartItem[] = [];
  const enrichedItems: EnrichedCartItem[] = [];

  for (const item of cart.items) {
    const product = productById.get(item.product.toString());
    const variant = product?.variants.find((v) => v.sku === item.variantSku);
    if (!product?.isActive || !variant) continue;

    validItems.push(item);
    enrichedItems.push({
      productId: product._id.toString(),
      name: product.name,
      slug: product.slug,
      image: product.images[0]?.url,
      variantSku: variant.sku,
      attributeName: variant.attributeName,
      attributeValue: variant.attributeValue,
      unitPrice: variant.price,
      quantity: item.quantity,
      subtotal: variant.price * item.quantity,
      availableStock: variant.stock,
    });
  }

  if (validItems.length !== cart.items.length) {
    cart.set("items", validItems);
    await cart.save();
  }

  const subtotal = enrichedItems.reduce((sum, i) => sum + i.subtotal, 0);
  return { items: enrichedItems, subtotal };
}

function findVariant(
  product: { variants: IProductVariant[] } | null,
  sku: string,
): IProductVariant | undefined {
  return product?.variants.find((v) => v.sku === sku);
}

export async function getCart(userId: string): Promise<EnrichedCart> {
  const cart = await getOrCreateCart(userId);
  return enrichCart(cart);
}

export async function addItem(userId: string, input: AddCartItemInput): Promise<EnrichedCart> {
  const sku = input.variantSku.toUpperCase();
  const product = await Product.findOne({ _id: input.productId, isActive: true });
  const variant = findVariant(product, sku);
  if (!product || !variant) throw new NotFoundError("Producto o variante no encontrados");

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find(
    (item) => item.product.toString() === input.productId && item.variantSku === sku,
  );
  const newQuantity = (existing?.quantity ?? 0) + input.quantity;
  if (newQuantity > variant.stock) {
    throw new BadRequestError("Stock insuficiente para la cantidad solicitada");
  }

  if (existing) {
    existing.quantity = newQuantity;
  } else {
    cart.items.push({ product: product._id, variantSku: sku, quantity: input.quantity });
  }
  await cart.save();
  return enrichCart(cart);
}

export async function updateItemQuantity(
  userId: string,
  productId: string,
  variantSku: string,
  quantity: number,
): Promise<EnrichedCart> {
  const sku = variantSku.toUpperCase();
  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((i) => i.product.toString() === productId && i.variantSku === sku);
  if (!item) throw new NotFoundError("El producto no está en el carrito");

  const product = await Product.findById(productId);
  const variant = findVariant(product, sku);
  if (!variant) throw new NotFoundError("Variante no encontrada");
  if (quantity > variant.stock) {
    throw new BadRequestError("Stock insuficiente para la cantidad solicitada");
  }

  item.quantity = quantity;
  await cart.save();
  return enrichCart(cart);
}

export async function removeItem(
  userId: string,
  productId: string,
  variantSku: string,
): Promise<EnrichedCart> {
  const sku = variantSku.toUpperCase();
  const cart = await getOrCreateCart(userId);
  cart.set(
    "items",
    cart.items.filter((i) => !(i.product.toString() === productId && i.variantSku === sku)),
  );
  await cart.save();
  return enrichCart(cart);
}

export async function clearCart(userId: string): Promise<void> {
  await Cart.findOneAndUpdate(
    { user: userId },
    { $set: { items: [] } },
    { upsert: true },
  );
}

/** Fusiona el carrito local de un usuario anónimo al loguearse, sumando cantidades y respetando el stock disponible. */
export async function mergeAnonymousCart(userId: string, input: MergeCartInput): Promise<EnrichedCart> {
  const cart = await getOrCreateCart(userId);
  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  for (const localItem of input.items) {
    const sku = localItem.variantSku.toUpperCase();
    const product = productById.get(localItem.productId);
    const variant = findVariant(product ?? null, sku);
    if (!product || !variant) continue;

    const existing = cart.items.find(
      (i) => i.product.toString() === localItem.productId && i.variantSku === sku,
    );
    const combinedQuantity = Math.min((existing?.quantity ?? 0) + localItem.quantity, variant.stock);
    if (combinedQuantity <= 0) continue;

    if (existing) {
      existing.quantity = combinedQuantity;
    } else {
      cart.items.push({
        product: new Types.ObjectId(localItem.productId),
        variantSku: sku,
        quantity: combinedQuantity,
      });
    }
  }

  await cart.save();
  return enrichCart(cart);
}
