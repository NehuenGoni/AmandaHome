import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as userService from "../services/userService.js";
import type { AddressInput, UpdateAddressInput, UpdateProfileInput } from "../validators/userValidators.js";

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateProfileInput;
  const user = await userService.updateProfile(req.user!.id, input);
  res.json({ user });
});

export const addAddress = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as AddressInput;
  const user = await userService.addAddress(req.user!.id, input);
  res.status(201).json({ user });
});

export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateAddressInput;
  const user = await userService.updateAddress(req.user!.id, req.params.addressId as string, input);
  res.json({ user });
});

export const removeAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.removeAddress(req.user!.id, req.params.addressId as string);
  res.json({ user });
});
