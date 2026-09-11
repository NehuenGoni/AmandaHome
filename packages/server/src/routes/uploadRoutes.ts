import { Router } from "express";
import * as uploadController from "../controllers/uploadController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";

export const uploadRouter = Router();

uploadRouter.post(
  "/products/sign",
  authenticate,
  requireRole("admin"),
  uploadController.signProductImageUpload,
);
