import { parseShippingOptionId, PROVINCES } from "@amanda/shared";
import { z } from "zod";
import { objectIdSchema } from "./commonValidators.js";

export const createCheckoutSchema = z
  .object({
    addressId: objectIdSchema.optional(),
    /** Opción elegida, tal como vino en la cotización: "pickup", "home:CP", "branch:EP", etc. */
    shippingOptionId: z.string().refine((id) => parseShippingOptionId(id) !== undefined, "Opción de envío inválida"),
    agencyCode: z.string().trim().min(1).max(20).optional(),
    provinceCode: z
      .string()
      .refine((code) => PROVINCES.some((p) => p.code === code), "Código de provincia inválido")
      .optional(),
    /** Centavos: el costo que el cliente vio al confirmar, para detectar si cambió entre la cotización y el pago. */
    expectedShippingCost: z.number().int().nonnegative(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const method = parseShippingOptionId(data.shippingOptionId)?.method;
    if (method === "home" && !data.addressId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["addressId"],
        message: "La dirección es requerida para el envío a domicilio",
      });
    }
    if (method === "branch" && (!data.agencyCode || !data.provinceCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agencyCode"],
        message: "Elegí la sucursal de Correo donde vas a retirar",
      });
    }
  });
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
