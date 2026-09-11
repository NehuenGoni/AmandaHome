import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { AdminInvite } from "./AdminInvite.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe("AdminInvite", () => {
  it("crea una invitación pendiente", async () => {
    const invite = await AdminInvite.create({
      email: "nuevo-admin@example.com",
      tokenHash: "hash-1",
      invitedBy: new Types.ObjectId(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });
    expect(invite.acceptedAt).toBeUndefined();
    expect(invite.revokedAt).toBeUndefined();
  });

  it("normaliza el email a minúsculas", async () => {
    const invite = await AdminInvite.create({
      email: "Nuevo-Admin@Example.com",
      tokenHash: "hash-2",
      invitedBy: new Types.ObjectId(),
      expiresAt: new Date(Date.now() + 1000 * 60),
    });
    expect(invite.email).toBe("nuevo-admin@example.com");
  });

  it("rechaza tokenHash duplicado", async () => {
    const invitedBy = new Types.ObjectId();
    await AdminInvite.create({
      email: "a@example.com",
      tokenHash: "hash-dup",
      invitedBy,
      expiresAt: new Date(Date.now() + 1000),
    });
    await expect(
      AdminInvite.create({
        email: "b@example.com",
        tokenHash: "hash-dup",
        invitedBy,
        expiresAt: new Date(Date.now() + 1000),
      }),
    ).rejects.toThrow();
  });
});
