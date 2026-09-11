import { z } from "zod";
import { objectIdSchema } from "./commonValidators.js";

export const SHIPPING_METHODS = ["pickup", "standard", "express"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const createCheckoutSchema = z.object({
  addressId: objectIdSchema,
  shippingMethod: z.enum(SHIPPING_METHODS),
  notes: z.string().optional(),
});
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
