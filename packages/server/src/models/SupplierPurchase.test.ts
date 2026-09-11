import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { SupplierPurchase } from "./SupplierPurchase.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

function buildPurchase(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    supplierName: "Textiles del Sur",
    items: [
      {
        product: new Types.ObjectId(),
        variantSku: "sku-1",
        quantity: 10,
        unitCost: 50000,
        totalCost: 500000,
      },
    ],
    totalCost: 500000,
    createdBy: new Types.ObjectId(),
    ...overrides,
  };
}

describe("SupplierPurchase", () => {
  it("crea una compra válida y normaliza el sku", async () => {
    const purchase = await SupplierPurchase.create(buildPurchase());
    expect(purchase.items[0]?.variantSku).toBe("SKU-1");
  });

  it("aplica purchaseDate por defecto", async () => {
    const purchase = await SupplierPurchase.create(buildPurchase());
    expect(purchase.purchaseDate).toBeInstanceOf(Date);
  });

  it("rechaza una compra sin ítems", async () => {
    await expect(SupplierPurchase.create(buildPurchase({ items: [] }))).rejects.toThrow();
  });

  it("requiere createdBy", async () => {
    const data = buildPurchase();
    // @ts-expect-error probando ausencia de campo requerido
    delete data.createdBy;
    await expect(SupplierPurchase.create(data)).rejects.toThrow();
  });
});
