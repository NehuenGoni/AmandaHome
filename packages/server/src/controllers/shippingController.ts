import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { User } from "../models/User.js";
import * as shippingService from "../services/shippingService.js";
import { getShippingSettings, toPublicShippingSettings, updateShippingSettings } from "../services/shippingSettingsService.js";
import { BadRequestError, NotFoundError } from "../utils/AppError.js";
import type {
  ListAgenciesInput,
  QuoteShippingInput,
  UpdateShippingSettingsInput,
} from "../validators/shippingValidators.js";

export const getPublicSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getShippingSettings();
  res.json({ settings: toPublicShippingSettings(settings) });
});

export const listAgencies = asyncHandler(async (req: Request, res: Response) => {
  const { provinceCode } = req.query as unknown as ListAgenciesInput;
  const agencies = await shippingService.listAgencies(provinceCode);
  res.json({ agencies });
});

export const quoteShipping = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as QuoteShippingInput;
  const { items, subtotal } = await shippingService.getShippingItemsForCart(req.user!.id);
  if (items.length === 0) {
    throw new BadRequestError("El carrito está vacío");
  }

  let destinationPostalCode: string | undefined;
  if (input.addressId) {
    const user = await User.findById(req.user!.id);
    const address = user?.addresses.find((a) => a._id.toString() === input.addressId);
    if (!address) throw new NotFoundError("Dirección no encontrada");
    destinationPostalCode = address.postalCode;
  }

  const agency =
    input.agencyCode && input.provinceCode
      ? await shippingService.findAgency(input.provinceCode, input.agencyCode)
      : undefined;

  const { options } = await shippingService.quoteShipping({ items, subtotal, destinationPostalCode, agency });
  res.json({ options });
});

export const getAdminSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getShippingSettings();
  res.json({ settings });
});

export const updateAdminSettings = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateShippingSettingsInput;
  const settings = await updateShippingSettings(input);
  res.json({ settings });
});
