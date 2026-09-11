import { Router } from "express";
import * as categoryController from "../controllers/categoryController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  createCategorySchema,
  listCategoriesQuerySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
} from "../validators/categoryValidators.js";
import { mongoIdParamSchema } from "../validators/commonValidators.js";

export const adminCategoryRouter = Router();

adminCategoryRouter.use(authenticate, requireRole("admin"));

adminCategoryRouter.get(
  "/",
  validateRequest(listCategoriesQuerySchema, "query"),
  categoryController.adminListCategories,
);
adminCategoryRouter.post("/", validateRequest(createCategorySchema), categoryController.createCategory);
adminCategoryRouter.post(
  "/reorder",
  validateRequest(reorderCategoriesSchema),
  categoryController.reorderCategories,
);
adminCategoryRouter.get(
  "/:id",
  validateRequest(mongoIdParamSchema, "params"),
  categoryController.adminGetCategory,
);
adminCategoryRouter.patch(
  "/:id",
  validateRequest(mongoIdParamSchema, "params"),
  validateRequest(updateCategorySchema),
  categoryController.updateCategory,
);
adminCategoryRouter.delete(
  "/:id",
  validateRequest(mongoIdParamSchema, "params"),
  categoryController.deleteCategory,
);
