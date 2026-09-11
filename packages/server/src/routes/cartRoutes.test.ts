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

async function customerToken() {
  const user = await User.create({
    email: `cliente-${Date.now()}-${Math.random()}@example.com`,
    password: "supersecreto123",
    firstName: "Cliente",
    lastName: "Test",
  });
  return signAccessToken({ sub: user._id.toString(), role: "customer" });
}

async function createProduct() {
  const category = await Category.create({ name: "Deco" });
  return Product.create({
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
}

describe("/api/cart", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).get("/api/cart");
    expect(res.status).toBe(401);
  });

  it("agrega, actualiza, elimina y vacía el carrito", async () => {
    const token = await customerToken();
    const product = await createProduct();

    const addRes = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product._id.toString(), variantSku: "MANTEL-1", quantity: 2 });
    expect(addRes.status).toBe(201);
    expect(addRes.body.items).toHaveLength(1);

    const updateRes = await request(app)
      .patch(`/api/cart/items/${product._id.toString()}/MANTEL-1`)
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 3 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.items[0].quantity).toBe(3);

    const getRes = await request(app).get("/api/cart").set("Authorization", `Bearer ${token}`);
    expect(getRes.body.subtotal).toBe(900000);

    const removeRes = await request(app)
      .delete(`/api/cart/items/${product._id.toString()}/MANTEL-1`)
      .set("Authorization", `Bearer ${token}`);
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.items).toHaveLength(0);
  });

  it("rechaza agregar más cantidad que el stock disponible", async () => {
    const token = await customerToken();
    const product = await createProduct();

    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product._id.toString(), variantSku: "MANTEL-1", quantity: 99 });
    expect(res.status).toBe(400);
  });

  it("fusiona un carrito anónimo al loguearse", async () => {
    const token = await customerToken();
    const product = await createProduct();

    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: product._id.toString(), variantSku: "MANTEL-1", quantity: 2 }] });
    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(2);
  });
});
