import { Router } from "express";
import * as seoController from "../controllers/seoController.js";

export const seoRouter = Router();

seoRouter.get("/sitemap.xml", seoController.getSitemap);
