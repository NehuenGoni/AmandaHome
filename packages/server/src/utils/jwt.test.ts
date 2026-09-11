import { describe, expect, it } from "vitest";
import {
  getRefreshTokenMaxAgeMs,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./jwt.js";

describe("access token", () => {
  it("firma y verifica un access token con sub y role", () => {
    const token = signAccessToken({ sub: "user-1", role: "customer" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.role).toBe("customer");
  });

  it("rechaza un token con firma inválida", () => {
    const token = signAccessToken({ sub: "user-1", role: "admin" });
    expect(() => verifyAccessToken(`${token}tampered`)).toThrow();
  });
});

describe("refresh token", () => {
  it("firma y verifica un refresh token, exponiendo su jti", () => {
    const { token, jti } = signRefreshToken("user-1");
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.jti).toBe(jti);
  });

  it("genera un jti distinto en cada llamada", () => {
    const a = signRefreshToken("user-1");
    const b = signRefreshToken("user-1");
    expect(a.jti).not.toBe(b.jti);
  });

  it("calcula expiresAt en el futuro", () => {
    const { expiresAt } = signRefreshToken("user-1");
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("un access token no puede verificarse como refresh token (secretos distintos)", () => {
    const accessToken = signAccessToken({ sub: "user-1", role: "customer" });
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});

describe("getRefreshTokenMaxAgeMs", () => {
  it("devuelve un número positivo de milisegundos", () => {
    expect(getRefreshTokenMaxAgeMs()).toBeGreaterThan(0);
  });
});
