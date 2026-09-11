import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mockPreferenceCreate = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn().mockImplementation(() => ({})),
  Preference: vi.fn().mockImplementation(() => ({ create: mockPreferenceCreate })),
  Payment: vi.fn().mockImplementation(() => ({ get: vi.fn() })),
}));

const { createOrderFromCart } = await import("./checkoutService.js");
const { Cart } = await import("../models/Cart.js");
const { Category } = await import("../models/Category.js");
const { Order } = await import("../models/Order.js");
const { Product } = await import("../models/Product.js");
const { User } = await import("../models/User.js");
const { clearTestDB, closeTestDB, connectTestDB } = await import("../test/dbTestUtils.js");

beforeAll(connectTestDB);
afterEach(() => {
  vi.clearAllMocks();
  return clearTestDB();
});
afterAll(closeTestDB);

async function createUserWithAddress() {
  const user = await User.create({
    email: `cliente-${Date.now()}-${Math.random()}@example.com`,
    password: "supersecreto123",
    firstName: "Cliente",
    lastName: "Test",
    addresses: [
      {
        street: "Av. Siempre Viva",
        number: "742",
        city: "CABA",
        province: "Buenos Aires",
        postalCode: "C1000",
        country: "Argentina",
      },
    ],
  });
  return { user, addressId: user.addresses[0]!._id.toString() };
}

async function createProductWithStock(stock = 5) {
  const unique = Math.random().toString(36).slice(2);
  const sku = `VELA-${unique}`;
  const category = await Category.create({ name: `Cat-${unique}` });
  const product = await Product.create({
    name: `Vela Aromática ${unique}`,
    category,
    variants: [
      {
        sku,
        attributeName: "Color",
        attributeValue: "Verde",
        price: 250000,
        costPrice: 100000,
        stock,
        lowStockThreshold: 1,
      },
    ],
  });
  return { product, sku };
}

describe("createOrderFromCart", () => {
  it("crea la orden, descuenta stock, vacía el carrito y devuelve la URL de pago", async () => {
    mockPreferenceCreate.mockResolvedValue({ id: "pref-1", init_point: "https://mp.test/checkout" });

    const { user, addressId } = await createUserWithAddress();
    const { product, sku } = await createProductWithStock(5);
    await Cart.create({
      user: user._id,
      items: [{ product: product._id, variantSku: sku, quantity: 2 }],
    });

    const { order, checkoutUrl } = await createOrderFromCart(user._id.toString(), {
      addressId,
      shippingMethod: "standard",
    });

    expect(checkoutUrl).toBe("https://mp.test/checkout");
    expect(order.status).toBe("pending");
    expect(order.subtotal).toBe(500000);
    expect(order.total).toBe(650000); // + 150000 de envío standard

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]?.stock).toBe(3);

    const cart = await Cart.findOne({ user: user._id });
    expect(cart?.items).toHaveLength(0);
  });

  it("calcula shippingCost 0 para retiro en local", async () => {
    mockPreferenceCreate.mockResolvedValue({ id: "pref-1", init_point: "https://mp.test/checkout" });

    const { user, addressId } = await createUserWithAddress();
    const { product, sku } = await createProductWithStock(5);
    await Cart.create({
      user: user._id,
      items: [{ product: product._id, variantSku: sku, quantity: 1 }],
    });

    const { order } = await createOrderFromCart(user._id.toString(), { addressId, shippingMethod: "pickup" });
    expect(order.shippingCost).toBe(0);
    expect(order.total).toBe(order.subtotal);
  });

  it("rechaza si el carrito está vacío", async () => {
    const { user, addressId } = await createUserWithAddress();
    await Cart.create({ user: user._id, items: [] });

    await expect(
      createOrderFromCart(user._id.toString(), { addressId, shippingMethod: "standard" }),
    ).rejects.toThrow();
  });

  it("rechaza una dirección que no pertenece al usuario", async () => {
    const { user } = await createUserWithAddress();
    const { product, sku } = await createProductWithStock(5);
    await Cart.create({
      user: user._id,
      items: [{ product: product._id, variantSku: sku, quantity: 1 }],
    });

    await expect(
      createOrderFromCart(user._id.toString(), {
        addressId: "64b000000000000000000000",
        shippingMethod: "standard",
      }),
    ).rejects.toThrow();
  });

  it("rechaza y no descuenta stock si algún ítem no tiene stock suficiente", async () => {
    const { user, addressId } = await createUserWithAddress();
    const { product: productA, sku: skuA } = await createProductWithStock(5);
    const { product: productB, sku: skuB } = await createProductWithStock(1);
    await Cart.create({
      user: user._id,
      items: [
        { product: productA._id, variantSku: skuA, quantity: 2 },
        { product: productB._id, variantSku: skuB, quantity: 5 },
      ],
    });

    await expect(
      createOrderFromCart(user._id.toString(), { addressId, shippingMethod: "standard" }),
    ).rejects.toThrow();

    // El primer ítem había descontado stock antes de fallar el segundo: debe revertirse.
    const restoredA = await Product.findById(productA._id);
    expect(restoredA?.variants[0]?.stock).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
  });
});
