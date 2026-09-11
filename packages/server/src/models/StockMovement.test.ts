import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { StockMovement } from "./StockMovement.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

function buildMovement(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    product: new Types.ObjectId(),
    variantSku: "sku-1",
    type: "sale_out",
    quantity: -2,
    previousStock: 5,
    newStock: 3,
    ...overrides,
  };
}

describe("StockMovement", () => {
  it("crea un movimiento válido y normaliza el sku", async () => {
    const movement = await StockMovement.create(buildMovement());
    expect(movement.variantSku).toBe("SKU-1");
  });

  it("permite createdBy ausente (movimiento automático del sistema)", async () => {
    const movement = await StockMovement.create(buildMovement());
    expect(movement.createdBy).toBeUndefined();
  });

  it("rechaza un type inválido", async () => {
    await expect(StockMovement.create(buildMovement({ type: "otro" }))).rejects.toThrow();
  });

  it("es inmutable: rechaza updateOne", async () => {
    const movement = await StockMovement.create(buildMovement());
    await expect(
      StockMovement.updateOne({ _id: movement._id }, { $set: { note: "editado" } }),
    ).rejects.toThrow();
  });

  it("es inmutable: rechaza findOneAndUpdate", async () => {
    const movement = await StockMovement.create(buildMovement());
    await expect(
      StockMovement.findOneAndUpdate({ _id: movement._id }, { $set: { note: "editado" } }),
    ).rejects.toThrow();
  });

  it("es inmutable: rechaza deleteOne", async () => {
    const movement = await StockMovement.create(buildMovement());
    await expect(StockMovement.deleteOne({ _id: movement._id })).rejects.toThrow();
  });
});
