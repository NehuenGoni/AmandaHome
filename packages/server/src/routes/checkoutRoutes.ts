import { Router } from "express";
import * as checkoutController from "../controllers/checkoutController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createCheckoutSchema } from "../validators/checkoutValidators.js";

export const checkoutRouter = Router();

checkoutRouter.post(
  "/",
  authenticate,
  validateRequest(createCheckoutSchema),
  checkoutController.createCheckout,
);
