import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { signAccessToken } from "../utils/jwt.js";

vi.mock("../services/email/emailService.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/email/emailService.js")>();
  return {
    ...actual,
    sendAdminInviteEmail: vi.fn(),
    sendAdminRevokedEmail: vi.fn(),
  };
});

const app = createApp();

beforeAll(connectTestDB);
afterEach(() => {
  vi.clearAllMocks();
  return clearTestDB();
});
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

describe("protección por rol en /api/admin", () => {
  it("rechaza sin autenticación", async () => {
    const res = await request(app).get("/api/admin/admins");
    expect(res.status).toBe(401);
  });

  it("rechaza a un customer autenticado", async () => {
    const { token } = await createUser("customer");
    const res = await request(app).get("/api/admin/admins").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe("flujo completo de invitaciones y administradores", () => {
  it("invita, lista, revoca invitación y luego revoca un admin", async () => {
    const { user: admin1, token: token1 } = await createUser("admin");
    const { token: token2 } = await createUser("admin");

    const inviteRes = await request(app)
      .post("/api/admin/invites")
      .set("Authorization", `Bearer ${token1}`)
      .send({ email: "nuevo-admin@example.com" });
    expect(inviteRes.status).toBe(201);

    const listRes = await request(app)
      .get("/api/admin/invites")
      .set("Authorization", `Bearer ${token1}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.invites).toHaveLength(1);

    const inviteId = listRes.body.invites[0]._id;
    const revokeInviteRes = await request(app)
      .post(`/api/admin/invites/${inviteId}/revoke`)
      .set("Authorization", `Bearer ${token1}`);
    expect(revokeInviteRes.status).toBe(204);

    const adminsRes = await request(app).get("/api/admin/admins").set("Authorization", `Bearer ${token1}`);
    expect(adminsRes.status).toBe(200);
    expect(adminsRes.body.admins).toHaveLength(2);

    const revokeAdminRes = await request(app)
      .post(`/api/admin/admins/${admin1._id.toString()}/revoke`)
      .set("Authorization", `Bearer ${token2}`);
    expect(revokeAdminRes.status).toBe(200);
    expect(revokeAdminRes.body.user.role).toBe("customer");
  });

  it("rechaza que el único admin se revoque a sí mismo", async () => {
    const { user, token } = await createUser("admin");
    const res = await request(app)
      .post(`/api/admin/admins/${user._id.toString()}/revoke`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("rechaza dejar el sistema sin administradores", async () => {
    const { user: admin1, token: token1 } = await createUser("admin");
    const { user: admin2, token: token2 } = await createUser("admin");

    await request(app)
      .post(`/api/admin/admins/${admin2._id.toString()}/revoke`)
      .set("Authorization", `Bearer ${token1}`);

    const res = await request(app)
      .post(`/api/admin/admins/${admin1._id.toString()}/revoke`)
      .set("Authorization", `Bearer ${token2}`);
    expect(res.status).toBe(409);
  });

  it("valida el formato del id en los params", async () => {
    const { token } = await createUser("admin");
    const res = await request(app)
      .post("/api/admin/admins/no-es-un-id/revoke")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
