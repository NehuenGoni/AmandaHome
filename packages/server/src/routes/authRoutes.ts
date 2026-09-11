import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";
import { forgotPasswordRateLimiter, loginRateLimiter, registerRateLimiter } from "../middleware/rateLimiters.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  acceptInviteSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validators/authValidators.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  registerRateLimiter,
  validateRequest(registerSchema),
  authController.register,
);
authRouter.post("/login", loginRateLimiter, validateRequest(loginSchema), authController.login);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", authenticate, authController.me);
authRouter.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword,
);
authRouter.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  authController.resetPassword,
);
authRouter.post(
  "/accept-invite",
  validateRequest(acceptInviteSchema),
  authController.acceptInvite,
);
