import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as storeSaleService from "../services/storeSaleService.js";
import type { MongoIdParam } from "../validators/commonValidators.js";
import type {
  CreateStoreSaleInput,
  EmailStoreSaleInput,
  ListStoreSalesQuery,
  LookupStoreProductQuery,
  ReturnStoreSaleInput,
  StoreSalesSummaryQuery,
  VoidStoreSaleInput,
} from "../validators/storeSaleValidators.js";

export const createStoreSale = asyncHandler(async (req: Request, res: Response) => {
  const sale = await storeSaleService.createStoreSale(req.body as CreateStoreSaleInput, req.user!.id);
  res.status(201).json({ sale });
});

export const listStoreSales = asyncHandler(async (req: Request, res: Response) => {
  const result = await storeSaleService.listStoreSales(req.query as unknown as ListStoreSalesQuery);
  res.json(result);
});

export const getStoreSalesSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await storeSaleService.getStoreSalesSummary(
    req.query as unknown as StoreSalesSummaryQuery,
  );
  res.json({ summary });
});

export const lookupProduct = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.query as unknown as LookupStoreProductQuery;
  const result = await storeSaleService.lookupByCode(code);
  res.json({ result });
});

export const getStoreSale = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const sale = await storeSaleService.getStoreSaleById(id);
  res.json({ sale });
});

export const voidStoreSale = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const { reason } = req.body as VoidStoreSaleInput;
  const sale = await storeSaleService.voidStoreSale(id, reason, req.user!.id);
  res.json({ sale });
});

export const returnStoreSaleItems = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const sale = await storeSaleService.returnStoreSaleItems(
    id,
    req.body as ReturnStoreSaleInput,
    req.user!.id,
  );
  res.status(201).json({ sale });
});

export const emailStoreSale = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const sale = await storeSaleService.emailStoreSale(id, req.body as EmailStoreSaleInput);
  res.json({ sale });
});
