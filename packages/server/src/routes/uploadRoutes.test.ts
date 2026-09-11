import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { Category } from "../models/Category.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { signAccessToken } from "../utils/jwt.js";

const app = createApp();

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe("POST /api/uploads/products/sign", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).post("/api/uploads/products/sign");
    expect(res.status).toBe(401);
  });

  it("rechaza a un customer autenticado", async () => {
    const customer = await User.create({
      email: "cliente@example.com",
      password: "supersecreto123",
      firstName: "Cliente",
      lastName: "Uno",
    });
    const token = signAccessToken({ sub: customer._id.toString(), role: "customer" });

    const res = await request(app)
      .post("/api/uploads/products/sign")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("devuelve los parámetros firmados para un admin", async () => {
    const admin = await User.create({
      email: "admin@example.com",
      password: "supersecreto123",
      firstName: "Admin",
      lastName: "Uno",
      role: "admin",
    });
    const token = signAccessToken({ sub: admin._id.toString(), role: "admin" });

    const res = await request(app)
      .post("/api/uploads/products/sign")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("signature");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body.folder).toBe("amanda/products");
  });
});

describe("POST /api/uploads/receipts/:orderId/sign", () => {
  async function createCustomerWithOrder() {
    const customer = await User.create({
      email: `cliente-${Date.now()}-${Math.random()}@example.com`,
      password: "supersecreto123",
      firstName: "Cliente",
      lastName: "Test",
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
    const order = await Order.create({
      orderNumber: 1,
      customer: customer._id,
      items: [
        {
          product: product._id,
          productName: "Mantel",
          variantSku: "MANTEL-1",
          attributeName: "Color",
          attributeValue: "Crudo",
          unitPrice: 300000,
          quantity: 1,
          subtotal: 300000,
        },
      ],
      subtotal: 300000,
      shippingCost: 0,
      total: 300000,
      paymentMethod: "mercado_pago",
      shippingMethod: "pickup",
      shippingAddress: {
        street: "Calle Falsa",
        city: "CABA",
        province: "Buenos Aires",
        postalCode: "C1000",
        country: "Argentina",
      },
    });
    const token = signAccessToken({ sub: customer._id.toString(), role: "customer" });
    return { token, order };
  }

  it("permite al dueño del pedido firmar la subida de su comprobante", async () => {
    const { token, order } = await createCustomerWithOrder();
    const res = await request(app)
      .post(`/api/uploads/receipts/${order._id.toString()}/sign`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.folder).toBe(`amanda/receipts/${order._id.toString()}`);
  });

  it("rechaza firmar la subida de un pedido ajeno", async () => {
    const { order } = await createCustomerWithOrder();
    const otherUser = await User.create({
      email: `otro-${Date.now()}@example.com`,
      password: "supersecreto123",
      firstName: "Otro",
      lastName: "Test",
    });
    const otherToken = signAccessToken({ sub: otherUser._id.toString(), role: "customer" });

    const res = await request(app)
      .post(`/api/uploads/receipts/${order._id.toString()}/sign`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});
