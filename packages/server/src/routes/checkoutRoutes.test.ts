import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mockPreferenceCreate = vi.fn();
const mockPaymentGet = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn().mockImplementation(() => ({})),
  Preference: vi.fn().mockImplementation(() => ({ create: mockPreferenceCreate })),
  Payment: vi.fn().mockImplementation(() => ({ get: mockPaymentGet })),
}));

const { createApp } = await import("../app.js");
const { Cart } = await import("../models/Cart.js");
const { Category } = await import("../models/Category.js");
const { Order } = await import("../models/Order.js");
const { Product } = await import("../models/Product.js");
const { User } = await import("../models/User.js");
const { clearTestDB, closeTestDB, connectTestDB } = await import("../test/dbTestUtils.js");
const { signAccessToken } = await import("../utils/jwt.js");

const app = createApp();

beforeAll(connectTestDB);
afterEach(() => {
  vi.clearAllMocks();
  return clearTestDB();
});
afterAll(closeTestDB);

async function setupCustomerWithCart() {
  const user = await User.create({
    email: `cliente-${Date.now()}-${Math.random()}@example.com`,
    password: "supersecreto123",
    firstName: "Cliente",
    lastName: "Test",
    addresses: [
      {
        street: "Calle Falsa",
        city: "CABA",
        province: "Buenos Aires",
        postalCode: "C1000",
        country: "Argentina",
      },
    ],
  });
  const category = await Category.create({ name: "Deco" });
  const product = await Product.create({
    name: "Mantel",
    category,
    variants: [
      {
        sku: "MANTEL-1",
        attributeName: "Color",
        attributeValue: "Crudo",
        price: 300000,
        costPrice: 150000,
        stock: 4,
        lowStockThreshold: 1,
      },
    ],
  });
  await Cart.create({
    user: user._id,
    items: [{ product: product._id, variantSku: "MANTEL-1", quantity: 1 }],
  });

  const token = signAccessToken({ sub: user._id.toString(), role: "customer" });
  return { token, addressId: user.addresses[0]!._id.toString() };
}

describe("POST /api/checkout", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app)
      .post("/api/checkout")
      .send({ addressId: "64b000000000000000000000", shippingMethod: "standard" });
    expect(res.status).toBe(401);
  });

  it("crea la orden y devuelve la URL de pago", async () => {
    mockPreferenceCreate.mockResolvedValue({ id: "pref-1", init_point: "https://mp.test/checkout" });
    const { token, addressId } = await setupCustomerWithCart();

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ addressId, shippingMethod: "standard" });

    expect(res.status).toBe(201);
    expect(res.body.checkoutUrl).toBe("https://mp.test/checkout");
    expect(res.body.order.status).toBe("pending");
  });
});

describe("POST /api/checkout/webhook", () => {
  it("responde 200 y procesa la notificación (pago aprobado)", async () => {
    mockPreferenceCreate.mockResolvedValue({ id: "pref-1", init_point: "https://mp.test/checkout" });
    const { token, addressId } = await setupCustomerWithCart();

    const checkoutRes = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ addressId, shippingMethod: "standard" });
    const orderId = checkoutRes.body.order._id;

    mockPaymentGet.mockResolvedValue({ id: "pay-1", status: "approved", external_reference: orderId });

    const webhookRes = await request(app)
      .post("/api/checkout/webhook")
      .send({ type: "payment", data: { id: "pay-1" } });
    expect(webhookRes.status).toBe(200);

    const order = await Order.findById(orderId);
    expect(order?.status).toBe("confirmed");
  });

  it("responde 200 incluso ante una notificación irrelevante", async () => {
    const res = await request(app)
      .post("/api/checkout/webhook")
      .send({ type: "merchant_order", data: { id: "1" } });
    expect(res.status).toBe(200);
  });

  it("acepta el formato de query params de Mercado Pago", async () => {
    mockPaymentGet.mockResolvedValue({
      id: "pay-2",
      status: "pending",
      external_reference: "sin-orden",
    });
    const res = await request(app).post("/api/checkout/webhook?type=payment&data.id=pay-2");
    expect(res.status).toBe(200);
    expect(mockPaymentGet).toHaveBeenCalled();
  });
});
