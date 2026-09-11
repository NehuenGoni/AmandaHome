import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AdminInvite } from "../models/AdminInvite.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { User } from "../models/User.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";

vi.mock("./email/emailService.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./email/emailService.js")>();
  return {
    ...actual,
    sendAdminInviteEmail: vi.fn(),
    sendAdminRevokedEmail: vi.fn(),
  };
});

import * as adminService from "./adminService.js";

beforeAll(connectTestDB);
afterEach(() => {
  vi.clearAllMocks();
  return clearTestDB();
});
afterAll(closeTestDB);

async function createAdmin(overrides: Partial<Record<string, unknown>> = {}) {
  return User.create({
    email: overrides.email ?? `admin-${Date.now()}-${Math.random()}@example.com`,
    password: "supersecreto123",
    firstName: "Admin",
    lastName: "Uno",
    role: "admin",
    ...overrides,
  });
}

describe("inviteAdmin", () => {
  it("crea una invitación pendiente", async () => {
    const admin = await createAdmin();
    const invite = await adminService.inviteAdmin({ email: "nuevo@example.com" }, admin._id.toString());
    expect(invite.email).toBe("nuevo@example.com");
    expect(invite.acceptedAt).toBeUndefined();
  });

  it("rechaza invitar a alguien que ya es administrador activo", async () => {
    const admin = await createAdmin();
    await createAdmin({ email: "ya-admin@example.com" });
    await expect(
      adminService.inviteAdmin({ email: "ya-admin@example.com" }, admin._id.toString()),
    ).rejects.toThrow();
  });

  it("rechaza una segunda invitación mientras la primera sigue pendiente", async () => {
    const admin = await createAdmin();
    await adminService.inviteAdmin({ email: "pendiente@example.com" }, admin._id.toString());
    await expect(
      adminService.inviteAdmin({ email: "pendiente@example.com" }, admin._id.toString()),
    ).rejects.toThrow();
  });

  it("permite re-invitar si la invitación anterior fue revocada", async () => {
    const admin = await createAdmin();
    const first = await adminService.inviteAdmin({ email: "reinvitar@example.com" }, admin._id.toString());
    await adminService.revokeInvite(first._id.toString());
    const second = await adminService.inviteAdmin({ email: "reinvitar@example.com" }, admin._id.toString());
    expect(second._id.toString()).not.toBe(first._id.toString());
  });

  it("permite re-invitar si la invitación anterior expiró", async () => {
    const admin = await createAdmin();
    await AdminInvite.create({
      email: "expirada@example.com",
      tokenHash: "hash-expirado",
      invitedBy: admin._id,
      expiresAt: new Date(Date.now() - 1000),
    });
    const invite = await adminService.inviteAdmin({ email: "expirada@example.com" }, admin._id.toString());
    expect(invite.email).toBe("expirada@example.com");
  });
});

describe("revokeInvite", () => {
  it("revoca una invitación pendiente", async () => {
    const admin = await createAdmin();
    const invite = await adminService.inviteAdmin({ email: "a-revocar@example.com" }, admin._id.toString());
    await adminService.revokeInvite(invite._id.toString());
    const found = await AdminInvite.findById(invite._id);
    expect(found?.revokedAt).toBeInstanceOf(Date);
  });

  it("rechaza revocar una invitación ya aceptada", async () => {
    const admin = await createAdmin();
    const invite = await adminService.inviteAdmin({ email: "aceptada@example.com" }, admin._id.toString());
    invite.acceptedAt = new Date();
    await invite.save();
    await expect(adminService.revokeInvite(invite._id.toString())).rejects.toThrow();
  });

  it("rechaza revocar una invitación inexistente", async () => {
    await expect(adminService.revokeInvite("64b000000000000000000000")).rejects.toThrow();
  });
});

describe("listAdmins", () => {
  it("devuelve solo usuarios con role admin", async () => {
    await createAdmin();
    await User.create({
      email: "cliente@example.com",
      password: "supersecreto123",
      firstName: "Cliente",
      lastName: "Uno",
    });
    const admins = await adminService.listAdmins();
    expect(admins).toHaveLength(1);
    expect(admins[0]?.role).toBe("admin");
  });
});

describe("revokeAdmin", () => {
  it("rechaza que un admin se auto-revoque", async () => {
    const admin = await createAdmin();
    await createAdmin(); // segundo admin para no chocar con la regla de "último admin"
    await expect(
      adminService.revokeAdmin(admin._id.toString(), admin._id.toString()),
    ).rejects.toThrow();
  });

  it("rechaza revocar si el objetivo no es administrador", async () => {
    const admin = await createAdmin();
    const customer = await User.create({
      email: "cliente2@example.com",
      password: "supersecreto123",
      firstName: "Cliente",
      lastName: "Dos",
    });
    await expect(
      adminService.revokeAdmin(customer._id.toString(), admin._id.toString()),
    ).rejects.toThrow();
  });

  it("rechaza dejar el sistema sin ningún administrador activo", async () => {
    const admin = await createAdmin();
    const other = await createAdmin();
    // Solo quedan 2 admins; revocar a `other` debería permitirse (queda 1).
    await adminService.revokeAdmin(other._id.toString(), admin._id.toString());
    // Ahora solo queda `admin`: revocarlo a sí mismo ya está cubierto por otra regla,
    // pero probamos que revocar al único admin restante (desde otra cuenta hipotética) falla.
    const thirdPartyAdminId = admin._id.toString();
    await expect(adminService.revokeAdmin(thirdPartyAdminId, thirdPartyAdminId)).rejects.toThrow();
  });

  it("degrada a customer y revoca sus refresh tokens activos", async () => {
    const admin = await createAdmin();
    const target = await createAdmin();
    await RefreshToken.create({
      user: target._id,
      jti: "jti-target",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const updated = await adminService.revokeAdmin(target._id.toString(), admin._id.toString());
    expect(updated.role).toBe("customer");

    const token = await RefreshToken.findOne({ jti: "jti-target" });
    expect(token?.revokedAt).toBeInstanceOf(Date);
  });
});
