import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as cashSessionService from "../services/cashSessionService.js";
import type {
  CashMovementInput,
  CloseCashSessionInput,
  ListCashSessionsQuery,
  OpenCashSessionInput,
} from "../validators/cashSessionValidators.js";
import type { MongoIdParam } from "../validators/commonValidators.js";

export const getCurrentSession = asyncHandler(async (_req: Request, res: Response) => {
  const session = await cashSessionService.getCurrentSession();
  res.json({ session });
});

export const openSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await cashSessionService.openSession(req.body as OpenCashSessionInput, req.user!.id);
  res.status(201).json({ session });
});

export const addMovement = asyncHandler(async (req: Request, res: Response) => {
  const session = await cashSessionService.addMovement(req.body as CashMovementInput, req.user!.id);
  res.status(201).json({ session });
});

export const closeSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await cashSessionService.closeSession(
    req.body as CloseCashSessionInput,
    req.user!.id,
  );
  res.json({ session });
});

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const result = await cashSessionService.listSessions(
    req.query as unknown as ListCashSessionsQuery,
  );
  res.json(result);
});

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const session = await cashSessionService.getSessionById(id);
  res.json({ session });
});
