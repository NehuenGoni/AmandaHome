import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { Product } from "./Product.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

function buildVariant(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sku: "vela-lavanda-m",
    attributeName: "Tamaño",
    attributeValue: "Mediano",
    price: 350000,
    costPrice: 180000,
    stock: 10,
    lowStockThreshold: 2,
    ...overrides,
  };
}

function buildProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "Vela de Lavanda",
    category: new Types.ObjectId(),
    variants: [buildVariant()],
    ...overrides,
  };
}

describe("Product", () => {
  it("autogenera el slug a partir del nombre", async () => {
    const product = await Product.create(buildProduct());
    expect(product.slug).toBe("vela-de-lavanda");
  });

  it("guarda el sku de la variante en mayúsculas", async () => {
    const product = await Product.create(buildProduct());
    expect(product.variants[0]?.sku).toBe("VELA-LAVANDA-M");
  });

  it("rechaza un producto sin variantes", async () => {
    await expect(Product.create(buildProduct({ variants: [] }))).rejects.toThrow();
  });

  it("rechaza sku duplicado entre productos distintos", async () => {
    await Product.create(buildProduct());
    await expect(
      Product.create(
        buildProduct({ name: "Otra Vela", variants: [buildVariant({ sku: "VELA-LAVANDA-M" })] }),
      ),
    ).rejects.toThrow();
  });

  it("aplica isActive true e isFeatured false por defecto", async () => {
    const product = await Product.create(buildProduct());
    expect(product.isActive).toBe(true);
    expect(product.isFeatured).toBe(false);
  });

  it("rechaza precios negativos", async () => {
    await expect(
      Product.create(buildProduct({ variants: [buildVariant({ price: -100 })] })),
    ).rejects.toThrow();
  });
});
