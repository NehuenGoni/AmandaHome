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

async function adminToken() {
  const admin = await User.create({
    email: `admin-${Date.now()}-${Math.random()}@example.com`,
    password: "supersecreto123",
    firstName: "Admin",
    lastName: "Test",
    role: "admin",
  });
  return signAccessToken({ sub: admin._id.toString(), role: "admin" });
}

async function createOrder(status: string = "pending") {
  const customer = await User.create({
    email: `cliente-${Date.now()}-${Math.random()}@example.com`,
    password: "supersecreto123",
    firstName: "Cliente",
    lastName: "Test",
  });
  const category = await Category.create({ name: `Deco-${Math.random()}` });
  const product = await Product.create({
    name: `Mantel-${Math.random()}`,
    category,
    variants: [
      {
        sku: `SKU-${Math.random().toString(36).slice(2)}`,
        attributeName: "Color",
        attributeValue: "Crudo",
        price: 300000,
        costPrice: 150000,
        stock: 4,
        lowStockThreshold: 1,
      },
    ],
  });
  return Order.create({
    orderNumber: Math.floor(Math.random() * 1_000_000),
    customer: customer._id,
    items: [
      {
        product: product._id,
        productName: product.name,
        variantSku: product.variants[0]!.sku,
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
    status,
    statusHistory: [{ status, changedAt: new Date() }],
    paymentMethod: "mercado_pago",
    paymentStatus: "approved",
    shippingMethod: "pickup",
    shippingAddress: {
      street: "Calle Falsa",
      city: "CABA",
      province: "Buenos Aires",
      postalCode: "C1000",
      country: "Argentina",
    },
  });
}

describe("/api/admin/orders", () => {
  it("rechaza a un customer", async () => {
    const customer = await User.create({
      email: `cliente-${Date.now()}@example.com`,
      password: "supersecreto123",
      firstName: "Cliente",
      lastName: "Test",
    });
    const token = signAccessToken({ sub: customer._id.toString(), role: "customer" });

    const res = await request(app).get("/api/admin/orders").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("lista todos los pedidos y filtra por status", async () => {
    const token = await adminToken();
    await createOrder("pending");
    await createOrder("delivered");

    const all = await request(app).get("/api/admin/orders").set("Authorization", `Bearer ${token}`);
    expect(all.body.total).toBe(2);

    const filtered = await request(app)
      .get("/api/admin/orders?status=delivered")
      .set("Authorization", `Bearer ${token}`);
    expect(filtered.body.total).toBe(1);
  });

  it("actualiza el estado de un pedido", async () => {
    const token = await adminToken();
    const order = await createOrder("pending");

    const res = await request(app)
      .patch(`/api/admin/orders/${order._id.toString()}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "confirmed", note: "Pago verificado manualmente" });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("confirmed");
  });

  it("rechaza una transición inválida", async () => {
    const token = await adminToken();
    const order = await createOrder("pending");

    const res = await request(app)
      .patch(`/api/admin/orders/${order._id.toString()}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "delivered" });

    expect(res.status).toBe(403);
  });
});
