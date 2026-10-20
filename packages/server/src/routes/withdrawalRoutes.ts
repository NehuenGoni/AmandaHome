import { Router } from "express";
import * as withdrawalController from "../controllers/withdrawalController.js";
import { withdrawalRateLimiter } from "../middleware/rateLimiters.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createWithdrawalSchema } from "../validators/withdrawalValidators.js";

export const withdrawalRouter = Router();

withdrawalRouter.post(
  "/",
  withdrawalRateLimiter,
  validateRequest(createWithdrawalSchema),
  withdrawalController.create,
);
