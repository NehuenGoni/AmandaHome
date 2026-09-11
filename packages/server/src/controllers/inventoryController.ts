import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as inventoryService from "../services/inventoryService.js";
import type { AdjustStockInput, ListMovementsQuery } from "../validators/inventoryValidators.js";

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as AdjustStockInput;
  const movement = await inventoryService.adjustStock(input, req.user!.id);
  res.status(201).json({ movement });
});

export const listMovements = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListMovementsQuery;
  const result = await inventoryService.listMovements(query);
  res.json(result);
});

export const listLowStock = asyncHandler(async (_req: Request, res: Response) => {
  const items = await inventoryService.listLowStock();
  res.json({ items });
});
