import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as uploadService from "../services/uploadService.js";

export const signProductImageUpload = asyncHandler(async (_req: Request, res: Response) => {
  const params = uploadService.signProductImageUpload();
  res.json(params);
});
