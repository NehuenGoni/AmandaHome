import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { Category } from "../models/Category.js";
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

describe("GET /api/categories (público)", () => {
  it("lista solo categorías activas", async () => {
    await Category.create({ name: "Activa" });
    await Category.create({ name: "Inactiva", isActive: false });

    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(1);
  });

  it("devuelve el detalle por slug", async () => {
    await Category.create({ name: "Textiles" });
    const res = await request(app).get("/api/categories/textiles");
    expect(res.status).toBe(200);
    expect(res.body.category.name).toBe("Textiles");
  });

  it("devuelve 404 para un slug inexistente", async () => {
    const res = await request(app).get("/api/categories/no-existe");
    expect(res.status).toBe(404);
  });
});

describe("/api/admin/categories", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).post("/api/admin/categories").send({ name: "X" });
    expect(res.status).toBe(401);
  });

  it("crea, lista (incluyendo inactivas), actualiza, reordena y elimina", async () => {
    const token = await adminToken();

    const createRes = await request(app)
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nueva Categoría" });
    expect(createRes.status).toBe(201);
    const categoryId = createRes.body.category._id;

    await request(app)
      .patch(`/api/admin/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ isActive: false });

    const listRes = await request(app)
      .get("/api/admin/categories?includeInactive=true")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.categories).toHaveLength(1);

    const listActiveOnly = await request(app)
      .get("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`);
    expect(listActiveOnly.body.categories).toHaveLength(0);

    const reorderRes = await request(app)
      .post("/api/admin/categories/reorder")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ id: categoryId, order: 3 }] });
    expect(reorderRes.status).toBe(204);

    const deleteRes = await request(app)
      .delete(`/api/admin/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app)
      .get(`/api/admin/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it("rechaza eliminar una categoría con subcategorías", async () => {
    const token = await adminToken();
    const parent = await Category.create({ name: "Padre" });
    await Category.create({ name: "Hija", parent: parent._id });

    const res = await request(app)
      .delete(`/api/admin/categories/${parent._id.toString()}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
  });
});
