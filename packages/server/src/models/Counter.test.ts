import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { getNextSequence } from "./Counter.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe("getNextSequence", () => {
  it("empieza en 1 para un contador nuevo", async () => {
    expect(await getNextSequence("orderNumber")).toBe(1);
  });

  it("incrementa en cada llamada", async () => {
    await getNextSequence("orderNumber");
    await getNextSequence("orderNumber");
    expect(await getNextSequence("orderNumber")).toBe(3);
  });

  it("mantiene contadores independientes por nombre", async () => {
    await getNextSequence("orderNumber");
    expect(await getNextSequence("invoiceNumber")).toBe(1);
  });

  it("nunca repite un número bajo llamadas concurrentes", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => getNextSequence("concurrent")),
    );
    expect(new Set(results).size).toBe(20);
  });
});
