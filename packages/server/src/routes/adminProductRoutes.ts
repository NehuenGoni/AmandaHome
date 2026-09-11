import { Router } from "express";
import * as productController from "../controllers/productController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  adminListProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
} from "../validators/productValidators.js";
import { mongoIdParamSchema } from "../validators/commonValidators.js";

export const adminProductRouter = Router();

adminProductRouter.use(authenticate, requireRole("admin"));

adminProductRouter.get(
  "/",
  validateRequest(adminListProductsQuerySchema, "query"),
  productController.adminListProducts,
);
adminProductRouter.post("/", validateRequest(createProductSchema), productController.createProduct);
adminProductRouter.get(
  "/:id",
  validateRequest(mongoIdParamSchema, "params"),
  productController.adminGetProduct,
);
adminProductRouter.patch(
  "/:id",
  validateRequest(mongoIdParamSchema, "params"),
  validateRequest(updateProductSchema),
  productController.updateProduct,
);
adminProductRouter.delete(
  "/:id",
  validateRequest(mongoIdParamSchema, "params"),
  productController.deleteProduct,
);
