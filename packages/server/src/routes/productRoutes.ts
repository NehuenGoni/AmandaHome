import { Router } from "express";
import * as productController from "../controllers/productController.js";
import { optionalAuthenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { listProductsQuerySchema } from "../validators/productValidators.js";

export const productRouter = Router();

productRouter.get(
  "/",
  optionalAuthenticate,
  validateRequest(listProductsQuerySchema, "query"),
  productController.listProducts,
);
productRouter.get("/:slug", optionalAuthenticate, productController.getProductBySlug);
