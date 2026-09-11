import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { Category } from "./Category.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe("Category", () => {
  it("autogenera el slug a partir del nombre", async () => {
    const category = await Category.create({ name: "Ropa de Cama" });
    expect(category.slug).toBe("ropa-de-cama");
  });

  it("normaliza un slug provisto explícitamente", async () => {
    const category = await Category.create({ name: "Baño", slug: "Baño Premium!" });
    expect(category.slug).toBe("bano-premium");
  });

  it("regenera el slug cuando cambia el nombre sin tocar el slug", async () => {
    const category = await Category.create({ name: "Cocina" });
    category.name = "Cocina y Living";
    await category.save();
    expect(category.slug).toBe("cocina-y-living");
  });

  it("rechaza slugs duplicados", async () => {
    await Category.create({ name: "Textiles" });
    await expect(Category.create({ name: "Textiles" })).rejects.toThrow();
  });

  it("permite parent null (categoría raíz) por defecto", async () => {
    const category = await Category.create({ name: "Deco" });
    expect(category.parent).toBeNull();
  });

  it("permite anidar bajo una categoría padre", async () => {
    const parent = await Category.create({ name: "Hogar" });
    const child = await Category.create({ name: "Velas", parent: parent._id });
    expect(child.parent?.toString()).toBe(parent._id.toString());
  });

  it("aplica isActive true y order 0 por defecto", async () => {
    const category = await Category.create({ name: "Nueva" });
    expect(category.isActive).toBe(true);
    expect(category.order).toBe(0);
  });
});
