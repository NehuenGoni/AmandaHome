import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as supplierPurchaseService from "../services/supplierPurchaseService.js";
import type { MongoIdParam } from "../validators/commonValidators.js";
import type {
  CreateSupplierPurchaseInput,
  ListSupplierPurchasesQuery,
} from "../validators/supplierPurchaseValidators.js";

export const createSupplierPurchase = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateSupplierPurchaseInput;
  const purchase = await supplierPurchaseService.createSupplierPurchase(input, req.user!.id);
  res.status(201).json({ purchase });
});

export const listSupplierPurchases = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListSupplierPurchasesQuery;
  const result = await supplierPurchaseService.listSupplierPurchases(query);
  res.json(result);
});

export const getSupplierPurchase = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const purchase = await supplierPurchaseService.getSupplierPurchaseById(id);
  res.json({ purchase });
});
