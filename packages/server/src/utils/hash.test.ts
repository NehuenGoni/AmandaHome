import { describe, expect, it } from "vitest";
import { generateRawToken, hashToken } from "./hash.js";

describe("generateRawToken", () => {
  it("genera tokens distintos en cada llamada", () => {
    expect(generateRawToken()).not.toBe(generateRawToken());
  });

  it("genera un string hexadecimal de 64 caracteres (32 bytes)", () => {
    expect(generateRawToken()).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("hashToken", () => {
  it("es determinístico para el mismo input", () => {
    const raw = generateRawToken();
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  it("produce hashes distintos para inputs distintos", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });

  it("nunca devuelve el token original", () => {
    const raw = "mi-token-secreto";
    expect(hashToken(raw)).not.toBe(raw);
  });
});
