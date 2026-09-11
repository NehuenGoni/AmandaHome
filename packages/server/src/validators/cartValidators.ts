import { z } from "zod";
import { objectIdSchema } from "./commonValidators.js";

export const addCartItemSchema = z.object({
  productId: objectIdSchema,
  variantSku: z.string().min(1, "El SKU es requerido"),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
});
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const cartItemParamsSchema = z.object({
  productId: objectIdSchema,
  variantSku: z.string().min(1),
});
export type CartItemParams = z.infer<typeof cartItemParamsSchema>;

export const mergeCartSchema = z.object({
  items: z.array(
    z.object({
      productId: objectIdSchema,
      variantSku: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ),
});
export type MergeCartInput = z.infer<typeof mergeCartSchema>;
