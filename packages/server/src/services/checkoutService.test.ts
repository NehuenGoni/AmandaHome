import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mockPreferenceCreate = vi.fn();
const envMockState = vi.hoisted(() => ({ isMercadoPagoConfigured: true }));

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn().mockImplementation(() => ({})),
  Preference: vi.fn().mockImplementation(() => ({ create: mockPreferenceCreate })),
  Payment: vi.fn().mockImplementation(() => ({ get: vi.fn() })),
}));

vi.mock("../config/env.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/env.js")>();
  return {
    ...actual,
    get isMercadoPagoConfigured() {
      return envMockState.isMercadoPagoConfigured;
    },
  };
});

const { createOrderFromCart, decrementStock } = await import("./checkoutService.js");
const { findAgency, quoteShipping } = await import("./shippingService.js");
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

/**
 * El checkout recotiza el envío (nunca confía en el precio que vio el
 * cliente), así que hay que pasarle el mismo costo que va a calcular: se
 * usa la misma `quoteShipping` (con el correo simulado, activo en test).
 */
async function getShippingCost(
  method: "pickup" | "home",
  quantities: number[],
  postalCode = "C1000",
): Promise<number> {
  const { options } = await quoteShipping({
    items: quantities.map((quantity) => ({ quantity })),
    subtotal: 0,
    destinationPostalCode: method === "home" ? postalCode : undefined,
  });
  return options.find((o) => o.id === (method === "home" ? "home:CP" : "pickup"))!.cost;
}

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

    const expectedShippingCost = await getShippingCost("home", [2]);
    const { order, checkoutUrl } = await createOrderFromCart(user._id.toString(), {
      addressId,
      shippingOptionId: "home:CP",
      expectedShippingCost,
    });

    expect(checkoutUrl).toBe("https://mp.test/checkout");
    expect(order.status).toBe("pending");
    expect(order.subtotal).toBe(500000);
    expect(order.shippingCost).toBe(expectedShippingCost);
    expect(order.total).toBe(500000 + expectedShippingCost);
    expect(order.paymentDetails?.initPoint).toBe("https://mp.test/checkout");
    expect(order.paymentDetails?.expiresAt).toBeInstanceOf(Date);

    const preferenceBody = mockPreferenceCreate.mock.calls[0][0].body;
    expect(preferenceBody.expires).toBe(true);
    expect(preferenceBody.expiration_date_to).toBeDefined();

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

    const { order } = await createOrderFromCart(user._id.toString(), {
      addressId,
      shippingOptionId: "pickup",
      expectedShippingCost: 0,
    });
    expect(order.shippingCost).toBe(0);
    expect(order.total).toBe(order.subtotal);
  });

  it("guarda el servicio Expreso y el paquete cotizado en el envío a domicilio", async () => {
    mockPreferenceCreate.mockResolvedValue({ id: "pref-1", init_point: "https://mp.test/checkout" });

    const { user, addressId } = await createUserWithAddress();
    const { product, sku } = await createProductWithStock(5);
    await Cart.create({ user: user._id, items: [{ product: product._id, variantSku: sku, quantity: 1 }] });

    const { options } = await quoteShipping({
      items: [{ quantity: 1 }],
      subtotal: 0,
      destinationPostalCode: "C1000",
    });
    const express = options.find((o) => o.id === "home:EP")!;

    const { order } = await createOrderFromCart(user._id.toString(), {
      addressId,
      shippingOptionId: "home:EP",
      expectedShippingCost: express.cost,
    });
    expect(order.shippingMethod).toBe("home");
    expect(order.shippingCost).toBe(express.cost);
    expect(order.shippingDetails?.service).toBe("EP");
    expect(order.shippingDetails?.packageWeight).toBe(500);
  });

  it("crea un pedido para retirar en una sucursal de Correo, sin dirección del cliente", async () => {
    mockPreferenceCreate.mockResolvedValue({ id: "pref-1", init_point: "https://mp.test/checkout" });

    const { user } = await createUserWithAddress();
    const { product, sku } = await createProductWithStock(5);
    await Cart.create({ user: user._id, items: [{ product: product._id, variantSku: sku, quantity: 1 }] });

    const agency = await findAgency("B", "B0002");
    const { options } = await quoteShipping({ items: [{ quantity: 1 }], subtotal: 0, agency });
    const branch = options.find((o) => o.id === "branch:CP")!;

    const { order } = await createOrderFromCart(user._id.toString(), {
      shippingOptionId: "branch:CP",
      provinceCode: "B",
      agencyCode: "B0002",
      expectedShippingCost: branch.cost,
    });
    expect(order.shippingMethod).toBe("branch");
    expect(order.shippingAddress).toBeUndefined();
    expect(order.shippingDetails?.service).toBe("CP");
    expect(order.shippingDetails?.agency).toMatchObject({ code: "B0002", name: "Sucursal Norte", postalCode: "1400" });
  });

  it("rechaza una sucursal que no está en la lista del correo", async () => {
    const { user } = await createUserWithAddress();
    const { product, sku } = await createProductWithStock(5);
    await Cart.create({ user: user._id, items: [{ product: product._id, variantSku: sku, quantity: 1 }] });

    await expect(
      createOrderFromCart(user._id.toString(), {
        shippingOptionId: "branch:CP",
        provinceCode: "B",
        agencyCode: "B9999",
        expectedShippingCost: 0,
      }),
    ).rejects.toThrow("Sucursal no encontrada");
    expect(await Order.countDocuments()).toBe(0);
  });

  it("rechaza si el carrito está vacío", async () => {
    const { user, addressId } = await createUserWithAddress();
    await Cart.create({ user: user._id, items: [] });

    await expect(
      createOrderFromCart(user._id.toString(), {
        addressId,
        shippingOptionId: "home:CP",
        expectedShippingCost: 0,
      }),
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
        shippingOptionId: "home:CP",
        expectedShippingCost: 0,
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

    const expectedShippingCost = await getShippingCost("home", [2, 5]);
    await expect(
      createOrderFromCart(user._id.toString(), { addressId, shippingOptionId: "home:CP", expectedShippingCost }),
    ).rejects.toThrow();

    // El primer ítem había descontado stock antes de fallar el segundo: debe revertirse.
    const restoredA = await Product.findById(productA._id);
    expect(restoredA?.variants[0]?.stock).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
  });

  it("si Mercado Pago falla al crear la preferencia: repone el stock, cancela la orden y no toca el carrito", async () => {
    mockPreferenceCreate.mockRejectedValue(new Error("Mercado Pago no responde"));

    const { user, addressId } = await createUserWithAddress();
    const { product, sku } = await createProductWithStock(5);
    await Cart.create({
      user: user._id,
      items: [{ product: product._id, variantSku: sku, quantity: 2 }],
    });

    const expectedShippingCost = await getShippingCost("home", [2]);
    await expect(
      createOrderFromCart(user._id.toString(), { addressId, shippingOptionId: "home:CP", expectedShippingCost }),
    ).rejects.toThrow();

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]?.stock).toBe(5); // se repuso

    const order = await Order.findOne({ customer: user._id });
    expect(order?.status).toBe("cancelled");

    const cart = await Cart.findOne({ user: user._id });
    expect(cart?.items).toHaveLength(1); // el cliente puede reintentar desde el mismo carrito

    const { StockMovement } = await import("../models/StockMovement.js");
    expect(await StockMovement.countDocuments()).toBe(0);
  });

  it("rechaza sin crear nada si Mercado Pago no está configurado", async () => {
    envMockState.isMercadoPagoConfigured = false;
    try {
      const { user, addressId } = await createUserWithAddress();
      const { product, sku } = await createProductWithStock(5);
      await Cart.create({
        user: user._id,
        items: [{ product: product._id, variantSku: sku, quantity: 1 }],
      });

      const expectedShippingCost = await getShippingCost("home", [1]);
      await expect(
        createOrderFromCart(user._id.toString(), { addressId, shippingOptionId: "home:CP", expectedShippingCost }),
      ).rejects.toThrow();

      expect(await Order.countDocuments()).toBe(0);
      const untouchedProduct = await Product.findById(product._id);
      expect(untouchedProduct?.variants[0]?.stock).toBe(5);
      expect(mockPreferenceCreate).not.toHaveBeenCalled();
    } finally {
      envMockState.isMercadoPagoConfigured = true;
    }
  });
});

describe("decrementStock", () => {
  it("no toca otra variante cuando la pedida no tiene stock suficiente", async () => {
    const unique = Math.random().toString(36).slice(2).toUpperCase();
    const category = await Category.create({ name: `Cat-${unique}` });
    const variant = (sku: string, attributeValue: string, stock: number) => ({
      sku,
      attributeName: "Color",
      attributeValue,
      price: 100000,
      costPrice: 50000,
      stock,
      lowStockThreshold: 1,
    });
    const product = await Product.create({
      name: `Multi ${unique}`,
      category,
      variants: [variant(`A-${unique}`, "Rojo", 0), variant(`B-${unique}`, "Azul", 10)],
    });

    await expect(
      decrementStock([{ product: product._id, variantSku: `A-${unique}`, quantity: 2 }]),
    ).rejects.toThrow(/Stock insuficiente/);

    const after = await Product.findById(product._id);
    expect(after!.variants.map((v) => v.stock)).toEqual([0, 10]);
  });
});
