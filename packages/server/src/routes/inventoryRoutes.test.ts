import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { Category } from "../models/Category.js";
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

async function createProduct(stock = 5, lowStockThreshold = 2) {
  const category = await Category.create({ name: `Deco-${Math.random()}` });
  return Product.create({
    name: `Mantel-${Math.random()}`,
    category,
    variants: [
      {
        sku: `SKU-${Math.random().toString(36).slice(2)}`,
        attributeName: "Color",
        attributeValue: "Crudo",
        price: 300000,
        costPrice: 150000,
        stock,
        lowStockThreshold,
      },
    ],
  });
}

describe("/api/inventory", () => {
  it("rechaza a un customer", async () => {
    const customer = await User.create({
      email: `cliente-${Date.now()}@example.com`,
      password: "supersecreto123",
      firstName: "Cliente",
      lastName: "Test",
    });
    const token = signAccessToken({ sub: customer._id.toString(), role: "customer" });
    const res = await request(app).get("/api/inventory/movements").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("ajusta stock, lo lista en movimientos y refleja el low-stock", async () => {
    const token = await adminToken();
    const product = await createProduct(5, 10);
    const sku = product.variants[0]!.sku;

    const adjustRes = await request(app)
      .post("/api/inventory/adjustments")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product._id.toString(), variantSku: sku, quantityChange: -3, note: "rotura" });
    expect(adjustRes.status).toBe(201);
    expect(adjustRes.body.movement.newStock).toBe(2);

    const movementsRes = await request(app)
      .get("/api/inventory/movements")
      .set("Authorization", `Bearer ${token}`);
    expect(movementsRes.body.total).toBe(1);

    const lowStockRes = await request(app)
      .get("/api/inventory/low-stock")
      .set("Authorization", `Bearer ${token}`);
    expect(lowStockRes.status).toBe(200);
    expect(lowStockRes.body.items).toHaveLength(1);
    expect(lowStockRes.body.items[0].variantSku).toBe(sku);
  });

  it("rechaza un ajuste que dejaría stock negativo", async () => {
    const token = await adminToken();
    const product = await createProduct(2);
    const sku = product.variants[0]!.sku;

    const res = await request(app)
      .post("/api/inventory/adjustments")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product._id.toString(), variantSku: sku, quantityChange: -10 });
    expect(res.status).toBe(400);
  });
});
