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

function variant(sku: string) {
  return {
    sku,
    attributeName: "Color",
    attributeValue: "Azul",
    price: 199900,
    costPrice: 90000,
    stock: 3,
    lowStockThreshold: 1,
  };
}

describe("GET /api/products (público)", () => {
  it("lista solo productos activos sin autenticación", async () => {
    const category = await Category.create({ name: "Deco" });
    await Product.create({ name: "Activo", category, variants: [variant("SKU-A")] });
    await Product.create({
      name: "Inactivo",
      category,
      isActive: false,
      variants: [variant("SKU-B")],
    });

    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("incluye inactivos cuando el viewer autenticado es admin", async () => {
    const token = await adminToken();
    const category = await Category.create({ name: "Deco" });
    await Product.create({ name: "Activo", category, variants: [variant("SKU-A")] });
    await Product.create({
      name: "Inactivo",
      category,
      isActive: false,
      variants: [variant("SKU-B")],
    });

    const res = await request(app).get("/api/products").set("Authorization", `Bearer ${token}`);
    expect(res.body.total).toBe(2);
  });

  it("devuelve el detalle por slug", async () => {
    const category = await Category.create({ name: "Deco" });
    await Product.create({ name: "Mantel", category, variants: [variant("SKU-A")] });
    const res = await request(app).get("/api/products/mantel");
    expect(res.status).toBe(200);
    expect(res.body.product.name).toBe("Mantel");
  });

  it("devuelve 404 para un producto inactivo sin ser admin", async () => {
    const category = await Category.create({ name: "Deco" });
    await Product.create({
      name: "Oculto",
      category,
      isActive: false,
      variants: [variant("SKU-A")],
    });
    const res = await request(app).get("/api/products/oculto");
    expect(res.status).toBe(404);
  });
});

describe("/api/admin/products", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).get("/api/admin/products");
    expect(res.status).toBe(401);
  });

  it("crea, lista, actualiza y elimina un producto", async () => {
    const token = await adminToken();
    const category = await Category.create({ name: "Deco" });

    const createRes = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Nuevo Producto",
        category: category._id.toString(),
        variants: [variant("SKU-NEW")],
      });
    expect(createRes.status).toBe(201);
    const productId = createRes.body.product._id;

    const updateRes = await request(app)
      .patch(`/api/admin/products/${productId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ isFeatured: true });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.product.isFeatured).toBe(true);

    const listRes = await request(app)
      .get("/api/admin/products")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.body.total).toBe(1);

    const deleteRes = await request(app)
      .delete(`/api/admin/products/${productId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);
  });

  it("rechaza crear un producto sin variantes", async () => {
    const token = await adminToken();
    const category = await Category.create({ name: "Deco" });
    const res = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Sin Variantes", category: category._id.toString(), variants: [] });
    expect(res.status).toBe(400);
  });
});
