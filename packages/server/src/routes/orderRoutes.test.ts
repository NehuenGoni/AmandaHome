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

async function createCustomerWithOrder() {
  const user = await User.create({
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
    customer: user._id,
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
    status: "pending",
    statusHistory: [{ status: "pending", changedAt: new Date() }],
    paymentMethod: "mercado_pago",
    paymentStatus: "pending",
    shippingMethod: "pickup",
    shippingAddress: {
      street: "Calle Falsa",
      city: "CABA",
      province: "Buenos Aires",
      postalCode: "C1000",
      country: "Argentina",
    },
  });

  const token = signAccessToken({ sub: user._id.toString(), role: "customer" });
  return { token, order, user };
}

describe("/api/orders", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("lista mis pedidos y permite ver el detalle", async () => {
    const { token, order } = await createCustomerWithOrder();

    const listRes = await request(app).get("/api/orders").set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(1);

    const detailRes = await request(app)
      .get(`/api/orders/${order._id.toString()}`)
      .set("Authorization", `Bearer ${token}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.order.orderNumber).toBe(1);
  });

  it("rechaza ver el pedido de otro usuario", async () => {
    const { order } = await createCustomerWithOrder();
    const otherUser = await User.create({
      email: `otro-${Date.now()}@example.com`,
      password: "supersecreto123",
      firstName: "Otro",
      lastName: "Test",
    });
    const otherToken = signAccessToken({ sub: otherUser._id.toString(), role: "customer" });

    const res = await request(app)
      .get(`/api/orders/${order._id.toString()}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it("adjunta un comprobante al propio pedido", async () => {
    const { token, order } = await createCustomerWithOrder();
    const res = await request(app)
      .patch(`/api/orders/${order._id.toString()}/receipt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ receiptUrl: "https://res.cloudinary.com/test/receipt.jpg" });
    expect(res.status).toBe(200);
    expect(res.body.order.receiptUrl).toBe("https://res.cloudinary.com/test/receipt.jpg");
  });
});
