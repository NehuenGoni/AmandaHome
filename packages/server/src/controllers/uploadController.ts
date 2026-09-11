import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as uploadService from "../services/uploadService.js";

export const signProductImageUpload = asyncHandler(async (_req: Request, res: Response) => {
  const params = uploadService.signProductImageUpload();
  res.json(params);
});

export const signReceiptUpload = asyncHandler(async (req: Request, res: Response) => {
  const params = await uploadService.signReceiptUpload(req.params.orderId as string, req.user!.id);
  res.json(params);
});
