import { Router } from "express";
import * as storeSaleController from "../controllers/storeSaleController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { mongoIdParamSchema } from "../validators/commonValidators.js";
import {
  createStoreSaleSchema,
  emailStoreSaleSchema,
  listStoreSalesQuerySchema,
  lookupStoreProductQuerySchema,
  returnStoreSaleSchema,
  storeSalesSummaryQuerySchema,
  voidStoreSaleSchema,
} from "../validators/storeSaleValidators.js";

export const adminStoreSaleRouter = Router();

adminStoreSaleRouter.use(authenticate, requireRole("admin"));

adminStoreSaleRouter.post("/", validateRequest(createStoreSaleSchema), storeSaleController.createStoreSale);
adminStoreSaleRouter.get(
  "/",
  validateRequest(listStoreSalesQuerySchema, "query"),
  storeSaleController.listStoreSales,
);
// Rutas fijas antes de "/:id" para que no se interpreten como un id.
adminStoreSaleRouter.get(
  "/summary",
  validateRequest(storeSalesSummaryQuerySchema, "query"),
  storeSaleController.getStoreSalesSummary,
);
adminStoreSaleRouter.get(
  "/lookup",
  validateRequest(lookupStoreProductQuerySchema, "query"),
  storeSaleController.lookupProduct,
);
adminStoreSaleRouter.get(
  "/:id",
  validateRequest(mongoIdParamSchema, "params"),
  storeSaleController.getStoreSale,
);
adminStoreSaleRouter.post(
  "/:id/void",
  validateRequest(mongoIdParamSchema, "params"),
  validateRequest(voidStoreSaleSchema),
  storeSaleController.voidStoreSale,
);
adminStoreSaleRouter.post(
  "/:id/returns",
  validateRequest(mongoIdParamSchema, "params"),
  validateRequest(returnStoreSaleSchema),
  storeSaleController.returnStoreSaleItems,
);
adminStoreSaleRouter.post(
  "/:id/email",
  validateRequest(mongoIdParamSchema, "params"),
  validateRequest(emailStoreSaleSchema),
  storeSaleController.emailStoreSale,
);
