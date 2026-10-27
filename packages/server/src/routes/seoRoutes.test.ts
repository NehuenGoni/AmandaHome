import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { buildSitemapXml } from "../services/seoService.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";

const app = createApp();

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

const variant = { sku: "SKU-1", attributeName: "Color", attributeValue: "Rojo", price: 1000, costPrice: 500, stock: 5 };

describe("GET /api/seo/sitemap.xml", () => {
  it("lista páginas fijas, categorías y productos activos, sin archivados ni inactivos", async () => {
    const category = await Category.create({ name: "Almohadones", slug: "almohadones" });
    await Product.create({ name: "Visible", slug: "visible", category: category._id, variants: [variant] });
    await Product.create({
      name: "Inactivo",
      slug: "inactivo",
      category: category._id,
      isActive: false,
      variants: [{ ...variant, sku: "SKU-2" }],
    });
    await Product.create({
      name: "Archivado",
      slug: "archivado",
      category: category._id,
      archivedAt: new Date(),
      variants: [{ ...variant, sku: "SKU-3" }],
    });

    const res = await request(app).get("/api/seo/sitemap.xml");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/xml/);
    expect(res.text).toContain("/categoria/almohadones</loc>");
    expect(res.text).toContain("/productos/visible</loc>");
    expect(res.text).not.toContain("/productos/inactivo");
    expect(res.text).not.toContain("/productos/archivado");
    expect(res.text).not.toContain("/admin");
  });
});

describe("buildSitemapXml", () => {
  it("escapa caracteres especiales y no duplica barras", () => {
    const xml = buildSitemapXml("https://ejemplo.com/", [{ path: "/productos/a&b" }]);
    expect(xml).toContain("<loc>https://ejemplo.com/productos/a&amp;b</loc>");
  });
});
