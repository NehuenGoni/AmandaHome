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

async function customerToken() {
  const user = await User.create({
    email: `cliente-${Date.now()}-${Math.random()}@example.com`,
    password: "supersecreto123",
    firstName: "Cliente",
    lastName: "Test",
  });
  return signAccessToken({ sub: user._id.toString(), role: "customer" });
}

describe("/api/users/me", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).patch("/api/users/me").send({ firstName: "X" });
    expect(res.status).toBe(401);
  });

  it("actualiza el perfil propio", async () => {
    const token = await customerToken();
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Actualizado" });
    expect(res.status).toBe(200);
    expect(res.body.user.firstName).toBe("Actualizado");
  });
});

describe("/api/users/me/addresses", () => {
  it("agrega, actualiza y elimina una dirección", async () => {
    const token = await customerToken();

    const addRes = await request(app)
      .post("/api/users/me/addresses")
      .set("Authorization", `Bearer ${token}`)
      .send({
        street: "Av. Siempre Viva",
        number: "742",
        city: "CABA",
        province: "Buenos Aires",
        postalCode: "C1000",
        country: "Argentina",
      });
    expect(addRes.status).toBe(201);
    expect(addRes.body.user.addresses).toHaveLength(1);
    const addressId = addRes.body.user.addresses[0]._id;

    const updateRes = await request(app)
      .patch(`/api/users/me/addresses/${addressId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ city: "Rosario" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user.addresses[0].city).toBe("Rosario");

    const deleteRes = await request(app)
      .delete(`/api/users/me/addresses/${addressId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.user.addresses).toHaveLength(0);
  });

  it("valida el formato del body al crear una dirección", async () => {
    const token = await customerToken();
    const res = await request(app)
      .post("/api/users/me/addresses")
      .set("Authorization", `Bearer ${token}`)
      .send({ street: "" });
    expect(res.status).toBe(400);
  });
});
