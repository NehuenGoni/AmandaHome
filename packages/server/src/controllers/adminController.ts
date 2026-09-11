import type { Request, Response } from "express";
import * as adminService from "../services/adminService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import type { InviteAdminInput } from "../validators/adminValidators.js";
import type { MongoIdParam } from "../validators/commonValidators.js";

export const inviteAdmin = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as InviteAdminInput;
  const invite = await adminService.inviteAdmin(input, req.user!.id);
  res.status(201).json({ invite });
});

export const listPendingInvites = asyncHandler(async (_req: Request, res: Response) => {
  const invites = await adminService.listPendingInvites();
  res.json({ invites });
});

export const revokeInvite = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  await adminService.revokeInvite(id);
  res.status(204).send();
});

export const listAdmins = asyncHandler(async (_req: Request, res: Response) => {
  const admins = await adminService.listAdmins();
  res.json({ admins });
});

export const revokeAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const user = await adminService.revokeAdmin(id, req.user!.id);
  res.json({ user });
});
