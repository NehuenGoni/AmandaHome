import { Router } from "express";
import * as shippingController from "../controllers/shippingController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { quoteShippingSchema } from "../validators/shippingValidators.js";

export const shippingRouter = Router();

shippingRouter.get("/settings", shippingController.getPublicSettings);
shippingRouter.post(
  "/quote",
  authenticate,
  validateRequest(quoteShippingSchema),
  shippingController.quoteShipping,
);
