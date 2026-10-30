import { PROVINCES } from "@amanda/shared";
import { z } from "zod";
import { objectIdSchema } from "./commonValidators.js";

const provinceCodeSchema = z
  .string()
  .refine((code) => PROVINCES.some((p) => p.code === code), "Código de provincia inválido");

export const quoteShippingSchema = z
  .object({
    addressId: objectIdSchema.optional(),
    /** Sucursal elegida para retirar: se resuelve en el servidor contra la lista de MiCorreo. */
    agencyCode: z.string().trim().min(1).max(20).optional(),
    provinceCode: provinceCodeSchema.optional(),
  })
  .refine((data) => !data.agencyCode || data.provinceCode, {
    path: ["provinceCode"],
    message: "La provincia es requerida para elegir una sucursal",
  });
export type QuoteShippingInput = z.infer<typeof quoteShippingSchema>;

export const listAgenciesSchema = z.object({
  provinceCode: provinceCodeSchema,
});
export type ListAgenciesInput = z.infer<typeof listAgenciesSchema>;

const pickupSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  address: z.string().optional(),
  hours: z.string().optional(),
  instructions: z.string().optional(),
});

const homeSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  expressEnabled: z.boolean().optional(),
  fallbackCost: z.number().int("El precio debe estar en centavos").nonnegative().optional(),
});

const branchSettingsSchema = z.object({
  enabled: z.boolean().optional(),
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
  branch: branchSettingsSchema.optional(),
  originPostalCode: z.string().min(1).optional(),
  defaultPackage: packageDefaultsSchema.optional(),
  freeShippingThreshold: z.number().int().nonnegative().nullable().optional(),
});
export type UpdateShippingSettingsInput = z.infer<typeof updateShippingSettingsSchema>;
