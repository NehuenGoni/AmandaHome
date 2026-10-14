import { findProvince } from "@amanda/shared";
import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const addressSchema = z.object({
  label: z.string().optional(),
  street: z.string().min(1, "La calle es requerida"),
  number: z.string().optional(),
  city: z.string().min(1, "La ciudad es requerida"),
  province: z
    .string()
    .min(1, "La provincia es requerida")
    .refine((value) => Boolean(findProvince(value)), "Provincia inválida"),
  postalCode: z
    .string()
    .min(1, "El código postal es requerido")
    .regex(/^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/, "Código postal inválido"),
  country: z.string().min(1).default("Argentina"),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const updateAddressSchema = addressSchema.partial();
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
