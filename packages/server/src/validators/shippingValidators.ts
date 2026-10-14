import { z } from "zod";
import { objectIdSchema } from "./commonValidators.js";

export const quoteShippingSchema = z.object({
  addressId: objectIdSchema.optional(),
});
export type QuoteShippingInput = z.infer<typeof quoteShippingSchema>;

const pickupSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  address: z.string().optional(),
  hours: z.string().optional(),
  instructions: z.string().optional(),
});

const homeSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  fallbackCost: z.number().int("El precio debe estar en centavos").nonnegative().optional(),
});

const packageDefaultsSchema = z.object({
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  width: z.number().positive().optional(),
  length: z.number().positive().optional(),
});

export const updateShippingSettingsSchema = z.object({
  pickup: pickupSettingsSchema.optional(),
  home: homeSettingsSchema.optional(),
  originPostalCode: z.string().min(1).optional(),
  defaultPackage: packageDefaultsSchema.optional(),
  freeShippingThreshold: z.number().int().nonnegative().nullable().optional(),
});
export type UpdateShippingSettingsInput = z.infer<typeof updateShippingSettingsSchema>;
