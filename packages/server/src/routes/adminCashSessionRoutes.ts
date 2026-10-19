import { Router } from "express";
import * as cashSessionController from "../controllers/cashSessionController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  cashMovementSchema,
  closeCashSessionSchema,
  listCashSessionsQuerySchema,
  openCashSessionSchema,
} from "../validators/cashSessionValidators.js";
import { mongoIdParamSchema } from "../validators/commonValidators.js";

export const adminCashSessionRouter = Router();

adminCashSessionRouter.use(authenticate, requireRole("admin"));

// "/current" va antes de "/:id" para que no lo capture como un id.
adminCashSessionRouter.get("/current", cashSessionController.getCurrentSession);
adminCashSessionRouter.post(
  "/current/movements",
  validateRequest(cashMovementSchema),
  cashSessionController.addMovement,
);
adminCashSessionRouter.post(
  "/current/close",
  validateRequest(closeCashSessionSchema),
  cashSessionController.closeSession,
);
adminCashSessionRouter.post(
  "/",
  validateRequest(openCashSessionSchema),
  cashSessionController.openSession,
);
adminCashSessionRouter.get(
  "/",
  validateRequest(listCashSessionsQuerySchema, "query"),
  cashSessionController.listSessions,
);
adminCashSessionRouter.get(
  "/:id",
  validateRequest(mongoIdParamSchema, "params"),
  cashSessionController.getSession,
);
