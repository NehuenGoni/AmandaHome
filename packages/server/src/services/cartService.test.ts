import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Cart } from "../models/Cart.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import * as cartService from "./cartService.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

async function createProduct(overrides: Partial<Record<string, unknown>> = {}) {
  const category = await Category.create({ name: `Cat-${Math.random()}` });
  return Product.create({
    name: "Vela",
    category,
    variants: [
      {
        sku: "VELA-1",
        attributeName: "Color",
        attributeValue: "Verde",
        price: 250000,
        costPrice: 100000,
        stock: 5,
        lowStockThreshold: 1,
      },
    ],
    ...overrides,
  });
}

describe("getCart", () => {
  it("crea un carrito vacío si el usuario no tiene uno", async () => {
    const userId = new Types.ObjectId().toString();
    const cart = await cartService.getCart(userId);
    expect(cart.items).toHaveLength(0);
    expect(cart.subtotal).toBe(0);
  });

  it("descarta items huérfanos (producto desactivado) y persiste la limpieza", async () => {
    const userId = new Types.ObjectId().toString();
    const product = await createProduct();
    await cartService.addItem(userId, { productId: product._id.toString(), variantSku: "VELA-1", quantity: 1 });

    product.isActive = false;
    await product.save();

    const cart = await cartService.getCart(userId);
    expect(cart.items).toHaveLength(0);

    const stored = await Cart.findOne({ user: userId });
    expect(stored?.items).toHaveLength(0);
  });
});

describe("addItem", () => {
  it("agrega un item nuevo y calcula el subtotal", async () => {
    const userId = new Types.ObjectId().toString();
    const product = await createProduct();

    const cart = await cartService.addItem(userId, {
      productId: product._id.toString(),
      variantSku: "vela-1",
      quantity: 2,
    });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(2);
    expect(cart.items[0]?.subtotal).toBe(500000);
    expect(cart.subtotal).toBe(500000);
  });

  it("suma cantidades si el item ya estaba en el carrito", async () => {
    const userId = new Types.ObjectId().toString();
    const product = await createProduct();

    await cartService.addItem(userId, { productId: product._id.toString(), variantSku: "VELA-1", quantity: 1 });
    const cart = await cartService.addItem(userId, {
      productId: product._id.toString(),
      variantSku: "VELA-1",
      quantity: 2,
    });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(3);
  });

  it("rechaza exceder el stock disponible", async () => {
    const userId = new Types.ObjectId().toString();
    const product = await createProduct();

    await expect(
      cartService.addItem(userId, { productId: product._id.toString(), variantSku: "VELA-1", quantity: 10 }),
    ).rejects.toThrow();
  });

  it("rechaza un producto inexistente", async () => {
    const userId = new Types.ObjectId().toString();
    await expect(
      cartService.addItem(userId, {
        productId: new Types.ObjectId().toString(),
        variantSku: "VELA-1",
        quantity: 1,
      }),
    ).rejects.toThrow();
  });

  it("rechaza una variante inexistente", async () => {
    const userId = new Types.ObjectId().toString();
    const product = await createProduct();
    await expect(
      cartService.addItem(userId, {
        productId: product._id.toString(),
        variantSku: "NO-EXISTE",
        quantity: 1,
      }),
    ).rejects.toThrow();
  });
});

describe("updateItemQuantity", () => {
  it("actualiza la cantidad de un item existente", async () => {
    const userId = new Types.ObjectId().toString();
    const product = await createProduct();
    await cartService.addItem(userId, { productId: product._id.toString(), variantSku: "VELA-1", quantity: 1 });

    const cart = await cartService.updateItemQuantity(userId, product._id.toString(), "VELA-1", 4);
    expect(cart.items[0]?.quantity).toBe(4);
  });

  it("rechaza si excede el stock", async () => {
    const userId = new Types.ObjectId().toString();
    const product = await createProduct();
    await cartService.addItem(userId, { productId: product._id.toString(), variantSku: "VELA-1", quantity: 1 });

    await expect(
      cartService.updateItemQuantity(userId, product._id.toString(), "VELA-1", 99),
    ).rejects.toThrow();
  });

  it("rechaza si el item no está en el carrito", async () => {
    const userId = new Types.ObjectId().toString();
    const product = await createProduct();
    await expect(
      cartService.updateItemQuantity(userId, product._id.toString(), "VELA-1", 1),
    ).rejects.toThrow();
  });
});

describe("removeItem / clearCart", () => {
  it("elimina un item puntual", async () => {
    const userId = new Types.ObjectId().toString();
    const product = await createProduct();
    await cartService.addItem(userId, { productId: product._id.toString(), variantSku: "VELA-1", quantity: 1 });

    const cart = await cartService.removeItem(userId, product._id.toString(), "VELA-1");
    expect(cart.items).toHaveLength(0);
  });

  it("vacía todo el carrito", async () => {
    const userId = new Types.ObjectId().toString();
    const product = await createProduct();
    await cartService.addItem(userId, { productId: product._id.toString(), variantSku: "VELA-1", quantity: 1 });

    await cartService.clearCart(userId);
    const cart = await cartService.getCart(userId);
    expect(cart.items).toHaveLength(0);
  });
});

describe("mergeAnonymousCart", () => {
  it("fusiona items locales sumando cantidades existentes", async () => {
    const userId = new Types.ObjectId().toString();
    const product = await createProduct();
    await cartService.addItem(userId, { productId: product._id.toString(), variantSku: "VELA-1", quantity: 1 });

    const cart = await cartService.mergeAnonymousCart(userId, {
      items: [{ productId: product._id.toString(), variantSku: "VELA-1", quantity: 2 }],
    });

    expect(cart.items[0]?.quantity).toBe(3);
  });

  it("clampa la cantidad combinada al stock disponible", async () => {
    const userId = new Types.ObjectId().toString();
    const product = await createProduct();

    const cart = await cartService.mergeAnonymousCart(userId, {
      items: [{ productId: product._id.toString(), variantSku: "VELA-1", quantity: 999 }],
    });

    expect(cart.items[0]?.quantity).toBe(5);
  });

  it("ignora items de productos inexistentes sin fallar", async () => {
    const userId = new Types.ObjectId().toString();
    const cart = await cartService.mergeAnonymousCart(userId, {
      items: [{ productId: new Types.ObjectId().toString(), variantSku: "X", quantity: 1 }],
    });
    expect(cart.items).toHaveLength(0);
  });
});
