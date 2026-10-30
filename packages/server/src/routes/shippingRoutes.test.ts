import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { signAccessToken } from "../utils/jwt.js";

const app = createApp();

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

async function createUser(role: "admin" | "customer") {
  const user = await User.create({
    email: `${role}-${Date.now()}-${Math.random()}@example.com`,
    password: "supersecreto123",
    firstName: role === "admin" ? "Admin" : "Cliente",
    lastName: "Test",
    role,
  });
  const token = signAccessToken({ sub: user._id.toString(), role: user.role });
  return { user, token };
}

describe("GET /api/shipping/settings", () => {
  it("es público y no expone el precio de respaldo ni el CP de origen", async () => {
    const res = await request(app).get("/api/shipping/settings");
    expect(res.status).toBe(200);
    expect(res.body.settings).toHaveProperty("pickup");
    expect(res.body.settings).toHaveProperty("homeEnabled");
    expect(res.body.settings).not.toHaveProperty("originPostalCode");
    expect(res.body.settings.home).toBeUndefined();
  });
});

describe("/api/admin/shipping/settings", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).get("/api/admin/shipping/settings");
    expect(res.status).toBe(401);
  });

  it("rechaza a un customer", async () => {
    const { token } = await createUser("customer");
    const res = await request(app)
      .get("/api/admin/shipping/settings")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("permite a un admin leer y actualizar la configuración", async () => {
    const { token } = await createUser("admin");

    const getRes = await request(app)
      .get("/api/admin/shipping/settings")
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.settings.home.fallbackCost).toBe(0);

    const putRes = await request(app)
      .put("/api/admin/shipping/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ home: { fallbackCost: 500000 }, freeShippingThreshold: 1000000 });
    expect(putRes.status).toBe(200);
    expect(putRes.body.settings.home.fallbackCost).toBe(500000);
    expect(putRes.body.settings.freeShippingThreshold).toBe(1000000);
  });
});

describe("GET /api/shipping/agencies", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).get("/api/shipping/agencies?provinceCode=B");
    expect(res.status).toBe(401);
  });

  it("rechaza un código de provincia inválido", async () => {
    const { token } = await createUser("customer");
    const res = await request(app)
      .get("/api/shipping/agencies?provinceCode=I")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("lista las sucursales de la provincia (correo simulado)", async () => {
    const { token } = await createUser("customer");
    const res = await request(app)
      .get("/api/shipping/agencies?provinceCode=X")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.agencies.length).toBeGreaterThan(0);
    expect(res.body.agencies[0]).toMatchObject({ provinceCode: "X", code: expect.stringMatching(/^X/) });
  });
});

describe("POST /api/shipping/quote", () => {
  it("exige la provincia si se elige una sucursal", async () => {
    const { token } = await createUser("customer");
    const res = await request(app)
      .post("/api/shipping/quote")
      .set("Authorization", `Bearer ${token}`)
      .send({ agencyCode: "B0001" });
    expect(res.status).toBe(400);
  });
});
