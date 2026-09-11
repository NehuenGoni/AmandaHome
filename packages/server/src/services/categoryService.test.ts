import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Category } from "../models/Category.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import * as categoryService from "./categoryService.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe("listPublicCategories", () => {
  it("devuelve solo categorías activas ordenadas", async () => {
    await Category.create({ name: "B", order: 2 });
    await Category.create({ name: "A", order: 1 });
    await Category.create({ name: "Inactiva", isActive: false, order: 0 });

    const categories = await categoryService.listPublicCategories();
    expect(categories.map((c) => c.name)).toEqual(["A", "B"]);
  });
});

describe("listAllCategories", () => {
  it("incluye inactivas cuando se pide", async () => {
    await Category.create({ name: "Activa" });
    await Category.create({ name: "Inactiva", isActive: false });

    expect(await categoryService.listAllCategories(false)).toHaveLength(1);
    expect(await categoryService.listAllCategories(true)).toHaveLength(2);
  });
});

describe("getPublicCategoryBySlug", () => {
  it("lanza NotFoundError si no existe", async () => {
    await expect(categoryService.getPublicCategoryBySlug("no-existe")).rejects.toThrow();
  });

  it("lanza NotFoundError si está inactiva", async () => {
    await Category.create({ name: "Oculta", isActive: false });
    await expect(categoryService.getPublicCategoryBySlug("oculta")).rejects.toThrow();
  });

  it("devuelve la categoría activa", async () => {
    await Category.create({ name: "Visible" });
    const found = await categoryService.getPublicCategoryBySlug("visible");
    expect(found.name).toBe("Visible");
  });
});

describe("createCategory", () => {
  it("crea una categoría raíz", async () => {
    const category = await categoryService.createCategory({ name: "Hogar" });
    expect(category.parent).toBeNull();
  });

  it("rechaza un parent inexistente", async () => {
    await expect(
      categoryService.createCategory({ name: "Hija", parent: "64b000000000000000000000" }),
    ).rejects.toThrow();
  });

  it("crea una subcategoría válida", async () => {
    const parent = await Category.create({ name: "Padre" });
    const child = await categoryService.createCategory({ name: "Hija", parent: parent._id.toString() });
    expect(child.parent?.toString()).toBe(parent._id.toString());
  });
});

describe("updateCategory", () => {
  it("actualiza campos simples", async () => {
    const category = await Category.create({ name: "Original" });
    const updated = await categoryService.updateCategory(category._id.toString(), {
      description: "Nueva descripción",
    });
    expect(updated.description).toBe("Nueva descripción");
  });

  it("rechaza que una categoría sea su propio padre", async () => {
    const category = await Category.create({ name: "Auto" });
    await expect(
      categoryService.updateCategory(category._id.toString(), { parent: category._id.toString() }),
    ).rejects.toThrow();
  });

  it("rechaza un ciclo indirecto en el árbol", async () => {
    const a = await Category.create({ name: "A" });
    const b = await Category.create({ name: "B", parent: a._id });
    const c = await Category.create({ name: "C", parent: b._id });

    // Intentar poner a C como padre de A generaría A -> C -> B -> A.
    await expect(
      categoryService.updateCategory(a._id.toString(), { parent: c._id.toString() }),
    ).rejects.toThrow();
  });

  it("lanza NotFoundError si la categoría no existe", async () => {
    await expect(
      categoryService.updateCategory("64b000000000000000000000", { name: "X" }),
    ).rejects.toThrow();
  });
});

describe("deleteCategory", () => {
  it("elimina una categoría sin subcategorías", async () => {
    const category = await Category.create({ name: "Solitaria" });
    await categoryService.deleteCategory(category._id.toString());
    expect(await Category.findById(category._id)).toBeNull();
  });

  it("rechaza eliminar una categoría con subcategorías", async () => {
    const parent = await Category.create({ name: "Padre" });
    await Category.create({ name: "Hija", parent: parent._id });
    await expect(categoryService.deleteCategory(parent._id.toString())).rejects.toThrow();
  });
});

describe("reorderCategories", () => {
  it("aplica el nuevo orden a cada categoría", async () => {
    const a = await Category.create({ name: "A", order: 0 });
    const b = await Category.create({ name: "B", order: 1 });

    await categoryService.reorderCategories({
      items: [
        { id: a._id.toString(), order: 5 },
        { id: b._id.toString(), order: 1 },
      ],
    });

    expect((await Category.findById(a._id))?.order).toBe(5);
  });
});
