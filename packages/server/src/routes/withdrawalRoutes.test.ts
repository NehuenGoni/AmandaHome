import { Types } from "mongoose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { WithdrawalRequest } from "../models/WithdrawalRequest.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";

const app = createApp();

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

async function createOrder(createdAt = new Date()) {
  const user = await User.create({
    email: "cliente@example.com",
    password: "supersecreto123",
    firstName: "Cliente",
    lastName: "Test",
  });
  const order = await Order.create({
    orderNumber: 77,
    customer: user._id,
    items: [
      {
        product: new Types.ObjectId(),
        productName: "Mantel",
        variantSku: "MANTEL-1",
        attributeName: "Color",
        attributeValue: "Crudo",
        unitPrice: 1000,
        quantity: 1,
        subtotal: 1000,
      },
    ],
    paymentMethod: "mercado_pago",
    subtotal: 0,
    shippingCost: 0,
    total: 0,
    shippingMethod: "pickup",
    createdAt,
  });
  return order;
}

describe("POST /api/withdrawals", () => {
  it("registra la solicitud cuando pedido y email coinciden", async () => {
    await createOrder();
    const res = await request(app)
      .post("/api/withdrawals")
      .send({ orderNumber: 77, email: "Cliente@Example.com", fullName: "Cliente Test" });
    expect(res.status).toBe(201);
    expect(res.body.requestNumber).toBe(1);
    const saved = await WithdrawalRequest.findOne({ requestNumber: 1 });
    expect(saved?.order).toBeDefined();
    expect(saved?.needsReview).toBe(false);
  });

  it("devuelve constancia aun si el pedido no existe, marcada para revisión", async () => {
    const res = await request(app)
      .post("/api/withdrawals")
      .send({ orderNumber: 999, email: "otro@example.com", fullName: "Alguien" });
    expect(res.status).toBe(201);
    const saved = await WithdrawalRequest.findOne({ requestNumber: res.body.requestNumber });
    expect(saved?.order).toBeUndefined();
    expect(saved?.needsReview).toBe(true);
  });

  it("marca para revisión si pasaron más de 10 días", async () => {
    await createOrder(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const res = await request(app)
      .post("/api/withdrawals")
      .send({ orderNumber: 77, email: "cliente@example.com", fullName: "Cliente Test" });
    expect(res.status).toBe(201);
    const saved = await WithdrawalRequest.findOne({ requestNumber: res.body.requestNumber });
    expect(saved?.needsReview).toBe(true);
  });

  it("rechaza datos inválidos", async () => {
    const res = await request(app).post("/api/withdrawals").send({ orderNumber: "x", email: "no", fullName: "" });
    expect(res.status).toBe(400);
  });
});
