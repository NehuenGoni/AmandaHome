import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as seoService from "../services/seoService.js";

export const getSitemap = asyncHandler(async (_req: Request, res: Response) => {
  const entries = await seoService.getSitemapEntries();
  res
    .type("application/xml")
    // 1 h en el CDN/navegador alcanza: los crawlers no piden el sitemap con esa frecuencia.
    .set("Cache-Control", "public, max-age=3600")
    .send(seoService.buildSitemapXml(env.CLIENT_URL, entries));
});
