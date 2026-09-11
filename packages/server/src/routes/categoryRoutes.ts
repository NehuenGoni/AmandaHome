import { Router } from "express";
import * as categoryController from "../controllers/categoryController.js";

export const categoryRouter = Router();

categoryRouter.get("/", categoryController.listCategories);
categoryRouter.get("/:slug", categoryController.getCategoryBySlug);
