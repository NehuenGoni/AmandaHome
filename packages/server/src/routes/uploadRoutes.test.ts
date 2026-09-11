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
