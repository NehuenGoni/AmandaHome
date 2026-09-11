import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import * as productService from "./productService.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

const defaultQuery = { page: 1, limit: 20 } as const;

function buildVariant(sku: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sku,
    attributeName: "Color",
    attributeValue: "Verde",
    price: 250000,
    costPrice: 120000,
    stock: 5,
    lowStockThreshold: 1,
    ...overrides,
  };
}

async function createCategory() {
  return Category.create({ name: `Cat-${Math.random()}` });
}

describe("listPublicProducts", () => {
  it("solo devuelve productos activos para un viewer no admin", async () => {
    const category = await createCategory();
    await Product.create({ name: "A", category, variants: [buildVariant("SKU-A")] });
    await Product.create({
      name: "B",
      category,
      isActive: false,
      variants: [buildVariant("SKU-B")],
    });

    const result = await productService.listPublicProducts(defaultQuery, false);
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("incluye inactivos cuando el viewer es admin", async () => {
    const category = await createCategory();
    await Product.create({ name: "A", category, variants: [buildVariant("SKU-A")] });
    await Product.create({
      name: "B",
      category,
      isActive: false,
      variants: [buildVariant("SKU-B")],
    });

    const result = await productService.listPublicProducts(defaultQuery, true);
    expect(result.total).toBe(2);
  });

  it("filtra por categoría", async () => {
    const catA = await createCategory();
    const catB = await createCategory();
    await Product.create({ name: "A", category: catA, variants: [buildVariant("SKU-A")] });
    await Product.create({ name: "B", category: catB, variants: [buildVariant("SKU-B")] });

    const result = await productService.listPublicProducts(
      { ...defaultQuery, category: catA._id.toString() },
      false,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("A");
  });

  it("filtra por isFeatured", async () => {
    const category = await createCategory();
    await Product.create({
      name: "Destacado",
      category,
      isFeatured: true,
      variants: [buildVariant("SKU-A")],
    });
    await Product.create({ name: "Normal", category, variants: [buildVariant("SKU-B")] });

    const result = await productService.listPublicProducts({ ...defaultQuery, isFeatured: true }, false);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Destacado");
  });

  it("busca por texto en nombre/descripción/tags", async () => {
    const category = await createCategory();
    await Product.create({
      name: "Vela Aromática",
      description: "Aroma a lavanda",
      category,
      variants: [buildVariant("SKU-A")],
    });
    await Product.create({ name: "Mantel de Lino", category, variants: [buildVariant("SKU-B")] });

    const result = await productService.listPublicProducts({ ...defaultQuery, search: "lavanda" }, false);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Vela Aromática");
  });

  it("pagina los resultados", async () => {
    const category = await createCategory();
    for (let i = 0; i < 5; i += 1) {
      await Product.create({ name: `P${i}`, category, variants: [buildVariant(`SKU-${i}`)] });
    }

    const result = await productService.listPublicProducts({ page: 1, limit: 2 }, false);
    expect(result.items).toHaveLength(2);
    expect(result.totalPages).toBe(3);
  });
});

describe("getPublicProductBySlug", () => {
  it("lanza NotFoundError para un producto inactivo sin viewer admin", async () => {
    const category = await createCategory();
    await Product.create({
      name: "Oculto",
      category,
      isActive: false,
      variants: [buildVariant("SKU-A")],
    });
    await expect(productService.getPublicProductBySlug("oculto", false)).rejects.toThrow();
  });

  it("devuelve el producto inactivo si el viewer es admin", async () => {
    const category = await createCategory();
    await Product.create({
      name: "Oculto",
      category,
      isActive: false,
      variants: [buildVariant("SKU-A")],
    });
    const product = await productService.getPublicProductBySlug("oculto", true);
    expect(product.name).toBe("Oculto");
  });
});

describe("createProduct / updateProduct / deleteProduct", () => {
  it("rechaza crear con una categoría inexistente", async () => {
    await expect(
      productService.createProduct({
        name: "X",
        category: new Types.ObjectId().toString(),
        tags: [],
        images: [],
        variants: [buildVariant("SKU-X")],
      }),
    ).rejects.toThrow();
  });

  it("crea, actualiza y elimina un producto", async () => {
    const category = await createCategory();
    const product = await productService.createProduct({
      name: "Producto",
      category: category._id.toString(),
      tags: [],
      images: [],
      variants: [buildVariant("SKU-Y")],
    });

    const updated = await productService.updateProduct(product._id.toString(), {
      name: "Producto Actualizado",
    });
    expect(updated.slug).toBe("producto-actualizado");

    await productService.deleteProduct(product._id.toString());
    await expect(productService.getAdminProductById(product._id.toString())).rejects.toThrow();
  });

  it("rechaza actualizar hacia una categoría inexistente", async () => {
    const category = await createCategory();
    const product = await productService.createProduct({
      name: "Producto",
      category: category._id.toString(),
      tags: [],
      images: [],
      variants: [buildVariant("SKU-Z")],
    });

    await expect(
      productService.updateProduct(product._id.toString(), {
        category: new Types.ObjectId().toString(),
      }),
    ).rejects.toThrow();
  });
});
