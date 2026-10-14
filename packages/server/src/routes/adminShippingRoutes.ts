import { Router } from "express";
import * as shippingController from "../controllers/shippingController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { updateShippingSettingsSchema } from "../validators/shippingValidators.js";

export const adminShippingRouter = Router();

adminShippingRouter.use(authenticate, requireRole("admin"));

adminShippingRouter.get("/settings", shippingController.getAdminSettings);
adminShippingRouter.put(
  "/settings",
  validateRequest(updateShippingSettingsSchema),
  shippingController.updateAdminSettings,
);
