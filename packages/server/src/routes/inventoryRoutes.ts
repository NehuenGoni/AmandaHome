import { Router } from "express";
import * as inventoryController from "../controllers/inventoryController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { adjustStockSchema, listMovementsQuerySchema } from "../validators/inventoryValidators.js";

export const inventoryRouter = Router();

inventoryRouter.use(authenticate, requireRole("admin"));

inventoryRouter.post("/adjustments", validateRequest(adjustStockSchema), inventoryController.adjustStock);
inventoryRouter.get(
  "/movements",
  validateRequest(listMovementsQuerySchema, "query"),
  inventoryController.listMovements,
);
inventoryRouter.get("/low-stock", inventoryController.listLowStock);
