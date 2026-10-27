import type { PublicProduct } from "@amanda/shared";
import { describe, expect, it } from "vitest";
import { isAnalyticsEnabled, isTrackablePath, trackEvent } from "./analytics";
import { cloudinaryUrl } from "./cloudinaryUrl";
import { buildBreadcrumbJsonLd, buildProductJsonLd } from "./structuredData";

const baseProduct = {
  _id: "p1",
  name: "Almohadón",
  slug: "almohadon",
  description: "Lino",
  category: "c1",
  brand: "Amanda",
  tags: [],
  isActive: true,
  isFeatured: false,
  images: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/a.jpg", source: "cloudinary", order: 0 }],
  variants: [
    { sku: "A-1", attributeName: "Color", attributeValue: "Rojo", price: 1000050, stock: 3, lowStockThreshold: 1 },
  ],
  createdAt: "",
  updatedAt: "",
} as unknown as PublicProduct;

describe("cloudinaryUrl", () => {
  it("agrega formato, calidad y ancho a imágenes de Cloudinary", () => {
    expect(cloudinaryUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg", { width: 600 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_600/v1/a.jpg",
    );
  });

  it("no toca URLs externas ni ya transformadas", () => {
    const external = "https://ejemplo.com/foto.jpg";
    const transformed = "https://res.cloudinary.com/demo/image/upload/w_100/v1/a.jpg";
    expect(cloudinaryUrl(external, { width: 600 })).toBe(external);
    expect(cloudinaryUrl(transformed, { width: 600 })).toBe(transformed);
  });
});

describe("structuredData", () => {
  it("arma Product con precio en pesos (no en centavos) y disponibilidad", () => {
    const [product] = buildProductJsonLd(baseProduct) as [Record<string, any>];
    expect(product["@type"]).toBe("Product");
    expect(product.offers.price).toBe("10000.50");
    expect(product.offers.priceCurrency).toBe("ARS");
    expect(product.offers.availability).toBe("https://schema.org/InStock");
  });

  it("usa AggregateOffer cuando las variantes tienen precios distintos y OutOfStock sin stock", () => {
    const product = {
      ...baseProduct,
      variants: [
        { ...baseProduct.variants[0]!, stock: 0 },
        { ...baseProduct.variants[0]!, sku: "A-2", price: 2000000, stock: 0 },
      ],
    } as PublicProduct;
    const [json] = buildProductJsonLd(product) as [Record<string, any>];
    expect(json.offers["@type"]).toBe("AggregateOffer");
    expect(json.offers.lowPrice).toBe("10000.50");
    expect(json.offers.highPrice).toBe("20000.00");
    expect(json.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("numera el breadcrumb desde 1", () => {
    const crumbs = buildBreadcrumbJsonLd([
      { name: "Inicio", path: "/" },
      { name: "Textiles", path: "/categoria/textiles" },
    ]) as { itemListElement: { position: number }[] };
    expect(crumbs.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });
});

describe("analytics", () => {
  it("excluye el panel de administración", () => {
    expect(isTrackablePath("/admin/ventas")).toBe(false);
    expect(isTrackablePath("/productos/almohadon")).toBe(true);
  });

  it("no hace nada sin ID de medición o fuera de producción", () => {
    expect(isAnalyticsEnabled()).toBe(false);
    expect(() => trackEvent("page_view")).not.toThrow();
  });
});
