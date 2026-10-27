import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { StockMovement } from "../models/StockMovement.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import * as productService from "./productService.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

const defaultQuery = { page: 1, limit: 20 } as const;
const adminId = new Types.ObjectId().toString();

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
      productService.createProduct(
        {
          name: "X",
          category: new Types.ObjectId().toString(),
          tags: [],
          images: [],
          variants: [buildVariant("SKU-X")],
        },
        adminId,
      ),
    ).rejects.toThrow();
  });

  it("crea, actualiza y elimina un producto", async () => {
    const category = await createCategory();
    const product = await productService.createProduct(
      {
        name: "Producto",
        category: category._id.toString(),
        tags: [],
        images: [],
        variants: [buildVariant("SKU-Y")],
      },
      adminId,
    );

    const updated = await productService.updateProduct(product._id.toString(), {
      name: "Producto Actualizado",
    });
    expect(updated.slug).toBe("producto-actualizado");

    await productService.archiveProduct(product._id.toString());
    const archived = await productService.getAdminProductById(product._id.toString());
    expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(archived.isActive).toBe(false);
  });

  it("rechaza actualizar hacia una categoría inexistente", async () => {
    const category = await createCategory();
    const product = await productService.createProduct(
      {
        name: "Producto",
        category: category._id.toString(),
        tags: [],
        images: [],
        variants: [buildVariant("SKU-Z")],
      },
      adminId,
    );

    await expect(
      productService.updateProduct(product._id.toString(), {
        category: new Types.ObjectId().toString(),
      }),
    ).rejects.toThrow();
  });
});

describe("costo oculto al público", () => {
  it("no devuelve costPrice en el listado, con y sin búsqueda", async () => {
    const category = await createCategory();
    await Product.create({ name: "Lampara", category, variants: [buildVariant("SKU-C1")] });
    await Product.syncIndexes();

    const plain = await productService.listPublicProducts(defaultQuery, false);
    expect(plain.items[0]!.variants[0]!.costPrice).toBeUndefined();

    const searched = await productService.listPublicProducts({ ...defaultQuery, search: "Lampara" }, false);
    expect(searched.items).toHaveLength(1);
    expect(searched.items[0]!.variants[0]!.costPrice).toBeUndefined();
  });

  it("no devuelve costPrice en el detalle por slug", async () => {
    const category = await createCategory();
    await Product.create({ name: "Vela", category, variants: [buildVariant("SKU-C2")] });
    const product = await productService.getPublicProductBySlug("vela", false);
    expect(product.variants[0]!.costPrice).toBeUndefined();
  });

  it("el admin sí ve el costo", async () => {
    const category = await createCategory();
    const created = await Product.create({ name: "Vela", category, variants: [buildVariant("SKU-C3")] });
    const product = await productService.getAdminProductById(created._id.toString());
    expect(product.variants[0]!.costPrice).toBe(120000);
  });
});

describe("el stock solo cambia por movimientos", () => {
  async function seedProduct() {
    const category = await createCategory();
    const product = await productService.createProduct(
      {
        name: "Jarron",
        category: category._id.toString(),
        tags: [],
        images: [],
        variants: [buildVariant("SKU-S1", { stock: 7 })],
      },
      adminId,
    );
    return product;
  }

  it("el stock inicial deja un movimiento", async () => {
    const product = await seedProduct();
    const movements = await StockMovement.find({ product: product._id });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ type: "adjustment", quantity: 7, previousStock: 0, newStock: 7 });
  });

  it("editar el producto conserva el stock aunque se intente cambiarlo", async () => {
    const product = await seedProduct();
    await productService.updateProduct(product._id.toString(), {
      variants: [{ ...buildVariant("SKU-S1", { price: 300000 }), stock: 999 } as never],
    });
    const reloaded = await Product.findById(product._id);
    expect(reloaded!.variants[0]!.stock).toBe(7);
    expect(reloaded!.variants[0]!.price).toBe(300000);
  });

  it("una variante nueva arranca con stock 0", async () => {
    const product = await seedProduct();
    await productService.updateProduct(product._id.toString(), {
      variants: [buildVariant("SKU-S1"), buildVariant("SKU-S2")] as never,
    });
    const reloaded = await Product.findById(product._id);
    expect(reloaded!.variants.find((v) => v.sku === "SKU-S2")!.stock).toBe(0);
  });

  it("no deja quitar una variante con stock", async () => {
    const product = await seedProduct();
    await expect(
      productService.updateProduct(product._id.toString(), {
        variants: [buildVariant("SKU-OTRO")] as never,
      }),
    ).rejects.toThrow(/tiene stock/);
  });
});

describe("archivado", () => {
  it("el listado admin excluye archivados salvo que se pidan", async () => {
    const category = await createCategory();
    const a = await Product.create({ name: "A", category, variants: [buildVariant("SKU-AR1")] });
    await Product.create({ name: "B", category, variants: [buildVariant("SKU-AR2")] });
    await productService.archiveProduct(a._id.toString());

    const base = { ...defaultQuery, includeInactive: true };
    const active = await productService.listAdminProducts({ ...base, archived: false });
    expect(active.items.map((p) => p.name)).toEqual(["B"]);
    const archived = await productService.listAdminProducts({ ...base, archived: true });
    expect(archived.items.map((p) => p.name)).toEqual(["A"]);
  });

  it("restaurar deja el producto inactivo y sin archivedAt", async () => {
    const category = await createCategory();
    const a = await Product.create({ name: "A", category, variants: [buildVariant("SKU-AR3")] });
    await productService.archiveProduct(a._id.toString());
    const restored = await productService.restoreProduct(a._id.toString());
    expect(restored.archivedAt).toBeUndefined();
    expect(restored.isActive).toBe(false);
  });

  it("no permite activar un producto archivado", async () => {
    const category = await createCategory();
    const a = await Product.create({ name: "A", category, variants: [buildVariant("SKU-AR4")] });
    await productService.archiveProduct(a._id.toString());
    await expect(productService.updateProduct(a._id.toString(), { isActive: true })).rejects.toThrow(/archivado/);
  });

  it("un archivado no se ve en el detalle público ni siendo admin", async () => {
    const category = await createCategory();
    const a = await Product.create({ name: "Oculto", category, variants: [buildVariant("SKU-AR5")] });
    await productService.archiveProduct(a._id.toString());
    await expect(productService.getPublicProductBySlug("oculto", true)).rejects.toThrow();
  });
});
