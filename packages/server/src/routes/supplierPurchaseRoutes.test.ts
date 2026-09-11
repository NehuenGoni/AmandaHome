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

async function createProduct(stock = 5) {
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
        lowStockThreshold: 1,
      },
    ],
  });
}

describe("/api/supplier-purchases", () => {
  it("rechaza a un customer", async () => {
    const customer = await User.create({
      email: `cliente-${Date.now()}@example.com`,
      password: "supersecreto123",
      firstName: "Cliente",
      lastName: "Test",
    });
    const token = signAccessToken({ sub: customer._id.toString(), role: "customer" });
    const res = await request(app)
      .post("/api/supplier-purchases")
      .set("Authorization", `Bearer ${token}`)
      .send({ supplierName: "X", items: [] });
    expect(res.status).toBe(403);
  });

  it("crea una compra, incrementa stock y la lista", async () => {
    const token = await adminToken();
    const product = await createProduct(3);
    const sku = product.variants[0]!.sku;

    const createRes = await request(app)
      .post("/api/supplier-purchases")
      .set("Authorization", `Bearer ${token}`)
      .send({
        supplierName: "Textiles del Sur",
        items: [{ productId: product._id.toString(), variantSku: sku, quantity: 7, unitCost: 40000 }],
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.purchase.totalCost).toBe(280000);

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]?.stock).toBe(10);

    const listRes = await request(app)
      .get("/api/supplier-purchases")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.body.total).toBe(1);

    const detailRes = await request(app)
      .get(`/api/supplier-purchases/${createRes.body.purchase._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.purchase.supplierName).toBe("Textiles del Sur");
  });

  it("rechaza una compra sin ítems", async () => {
    const token = await adminToken();
    const res = await request(app)
      .post("/api/supplier-purchases")
      .set("Authorization", `Bearer ${token}`)
      .send({ supplierName: "X", items: [] });
    expect(res.status).toBe(400);
  });
});
