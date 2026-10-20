import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as withdrawalService from "../services/withdrawalService.js";
import type { CreateWithdrawalInput } from "../validators/withdrawalValidators.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await withdrawalService.createWithdrawalRequest(req.body as CreateWithdrawalInput, req.ip);
  res.status(201).json(receipt);
});
