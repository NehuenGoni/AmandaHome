import { z } from "zod";
import { objectIdSchema } from "./commonValidators.js";

export const SHIPPING_METHODS = ["pickup", "home"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const createCheckoutSchema = z
  .object({
    addressId: objectIdSchema.optional(),
    shippingMethod: z.enum(SHIPPING_METHODS),
    /** Centavos: el costo que el cliente vio al confirmar, para detectar si cambió entre la cotización y el pago. */
    expectedShippingCost: z.number().int().nonnegative(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.shippingMethod === "home" && !data.addressId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["addressId"],
        message: "La dirección es requerida para el envío a domicilio",
      });
    }
  });
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
