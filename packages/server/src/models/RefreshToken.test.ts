import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { RefreshToken } from "./RefreshToken.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe("RefreshToken", () => {
  it("crea un refresh token válido", async () => {
    const token = await RefreshToken.create({
      user: new Types.ObjectId(),
      jti: "jti-1",
      expiresAt: new Date(Date.now() + 1000 * 60),
    });
    expect(token.revokedAt).toBeUndefined();
  });

  it("rechaza jti duplicado", async () => {
    const user = new Types.ObjectId();
    await RefreshToken.create({ user, jti: "jti-dup", expiresAt: new Date(Date.now() + 1000) });
    await expect(
      RefreshToken.create({ user, jti: "jti-dup", expiresAt: new Date(Date.now() + 1000) }),
    ).rejects.toThrow();
  });

  it("permite marcar un token como revocado", async () => {
    const token = await RefreshToken.create({
      user: new Types.ObjectId(),
      jti: "jti-revoke",
      expiresAt: new Date(Date.now() + 1000 * 60),
    });
    token.revokedAt = new Date();
    await token.save();
    const found = await RefreshToken.findById(token._id);
    expect(found?.revokedAt).toBeInstanceOf(Date);
  });
});
