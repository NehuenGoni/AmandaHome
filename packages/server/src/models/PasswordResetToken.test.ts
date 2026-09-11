import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { PasswordResetToken } from "./PasswordResetToken.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe("PasswordResetToken", () => {
  it("crea un token de reset asociado a un usuario", async () => {
    const token = await PasswordResetToken.create({
      user: new Types.ObjectId(),
      tokenHash: "hash-1",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    expect(token.usedAt).toBeUndefined();
  });

  it("rechaza tokenHash duplicado", async () => {
    const user = new Types.ObjectId();
    await PasswordResetToken.create({
      user,
      tokenHash: "hash-dup",
      expiresAt: new Date(Date.now() + 1000),
    });
    await expect(
      PasswordResetToken.create({ user, tokenHash: "hash-dup", expiresAt: new Date(Date.now() + 1000) }),
    ).rejects.toThrow();
  });

  it("permite marcar el token como usado", async () => {
    const token = await PasswordResetToken.create({
      user: new Types.ObjectId(),
      tokenHash: "hash-used",
      expiresAt: new Date(Date.now() + 1000 * 60),
    });
    token.usedAt = new Date();
    await token.save();
    const found = await PasswordResetToken.findById(token._id);
    expect(found?.usedAt).toBeInstanceOf(Date);
  });
});
