import { z } from "zod";
import { objectIdSchema } from "./commonValidators.js";

export const STOCK_MOVEMENT_TYPES = ["purchase_in", "sale_out", "adjustment", "return"] as const;

export const adjustStockSchema = z.object({
  productId: objectIdSchema,
  variantSku: z.string().min(1, "El SKU es requerido"),
  quantityChange: z.number().int().refine((v) => v !== 0, "El ajuste no puede ser 0"),
  note: z.string().optional(),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const listMovementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  product: objectIdSchema.optional(),
  variantSku: z.string().optional(),
  type: z.enum(STOCK_MOVEMENT_TYPES).optional(),
});
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
