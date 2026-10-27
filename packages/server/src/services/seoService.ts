import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";

export interface SitemapEntry {
  path: string;
  lastModified?: Date;
  changeFrequency?: "daily" | "weekly" | "monthly";
  priority?: number;
}

interface SlugRow {
  slug: string;
  updatedAt?: Date;
}

/** Páginas públicas fijas. Las privadas (admin, cuenta, checkout) quedan fuera a propósito. */
const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/catalogo", changeFrequency: "daily", priority: 0.9 },
  { path: "/contacto", changeFrequency: "monthly", priority: 0.5 },
  { path: "/cambios-y-devoluciones", changeFrequency: "monthly", priority: 0.3 },
  { path: "/terminos-y-condiciones", changeFrequency: "monthly", priority: 0.2 },
  { path: "/politica-de-privacidad", changeFrequency: "monthly", priority: 0.2 },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemapXml(origin: string, entries: SitemapEntry[]): string {
  const base = origin.replace(/\/+$/, "");
  const urls = entries.map((entry) => {
    const parts = [`<loc>${escapeXml(base + entry.path)}</loc>`];
    if (entry.lastModified) parts.push(`<lastmod>${entry.lastModified.toISOString()}</lastmod>`);
    if (entry.changeFrequency) parts.push(`<changefreq>${entry.changeFrequency}</changefreq>`);
    if (entry.priority !== undefined) parts.push(`<priority>${entry.priority.toFixed(1)}</priority>`);
    return `  <url>${parts.join("")}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const [categories, products] = await Promise.all([
    Category.find({ isActive: true }).select("slug updatedAt").lean<SlugRow[]>(),
    Product.find({ isActive: true, archivedAt: { $exists: false } }).select("slug updatedAt").lean<SlugRow[]>(),
  ]);

  return [
    ...STATIC_ENTRIES,
    ...categories.map<SitemapEntry>((c) => ({
      path: `/categoria/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    })),
    ...products.map<SitemapEntry>((p) => ({
      path: `/productos/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    })),
  ];
}
