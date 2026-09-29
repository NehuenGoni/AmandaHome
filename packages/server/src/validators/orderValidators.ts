import { z } from "zod";
import { objectIdSchema } from "./commonValidators.js";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const adminListOrdersQuerySchema = listOrdersQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  customer: objectIdSchema.optional(),
  needsReview: z.coerce.boolean().optional(),
});
export type AdminListOrdersQuery = z.infer<typeof adminListOrdersQuerySchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().optional(),
  trackingNumber: z.string().optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const attachReceiptSchema = z.object({
  receiptUrl: z.string().url("El comprobante debe ser una URL válida"),
});
export type AttachReceiptInput = z.infer<typeof attachReceiptSchema>;
