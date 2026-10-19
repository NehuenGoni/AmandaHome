import { z } from "zod";
import { objectIdSchema } from "./commonValidators.js";

const paymentMethodSchema = z.enum(["cash", "debit", "credit", "transfer"]);

/** Porcentaje (0-100) o monto en centavos enteros, según `type`. */
const discountSchema = z
  .object({
    type: z.enum(["percent", "amount"]),
    value: z.number().nonnegative("El descuento no puede ser negativo"),
  })
  .refine((d) => d.type !== "percent" || d.value <= 100, {
    message: "El porcentaje no puede superar 100",
    path: ["value"],
  })
  .refine((d) => d.type !== "amount" || Number.isInteger(d.value), {
    message: "El monto debe estar en centavos",
    path: ["value"],
  });

const saleItemSchema = z.object({
  productId: objectIdSchema,
  variantSku: z.string().trim().min(1, "El SKU es requerido"),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
  discount: discountSchema.optional(),
});

export const createStoreSaleSchema = z.object({
  items: z
    .array(saleItemSchema)
    .min(1, "La venta debe tener al menos un ítem")
    .max(100)
    .refine((items) => new Set(items.map((i) => i.variantSku.toUpperCase())).size === items.length, {
      message: "Hay productos repetidos: unificá las cantidades en una sola línea",
    }),
  discount: discountSchema.optional(),
  paymentMethod: paymentMethodSchema,
  cashReceived: z.number().int("El monto debe estar en centavos").nonnegative().optional(),
  paymentReference: z.string().trim().max(100).optional(),
  customer: z
    .object({
      name: z.string().trim().max(100).optional(),
      email: z.string().trim().email("Email inválido").optional(),
    })
    .optional(),
  notes: z.string().trim().max(500).optional(),
});
export type CreateStoreSaleInput = z.infer<typeof createStoreSaleSchema>;

export const voidStoreSaleSchema = z.object({
  reason: z.string().trim().min(1, "El motivo es requerido").max(300),
});
export type VoidStoreSaleInput = z.infer<typeof voidStoreSaleSchema>;

export const returnStoreSaleSchema = z.object({
  items: z
    .array(
      z.object({
        variantSku: z.string().trim().min(1),
        quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
      }),
    )
    .min(1, "Elegí al menos un ítem a devolver")
    .refine((items) => new Set(items.map((i) => i.variantSku.toUpperCase())).size === items.length, {
      message: "Hay productos repetidos en la devolución",
    }),
  refundMethod: paymentMethodSchema,
  reason: z.string().trim().max(300).optional(),
});
export type ReturnStoreSaleInput = z.infer<typeof returnStoreSaleSchema>;

export const emailStoreSaleSchema = z.object({
  email: z.string().trim().email("Email inválido"),
});
export type EmailStoreSaleInput = z.infer<typeof emailStoreSaleSchema>;

export const lookupStoreProductQuerySchema = z.object({
  code: z.string().trim().min(1, "El código es requerido").max(100),
});
export type LookupStoreProductQuery = z.infer<typeof lookupStoreProductQuerySchema>;

export const listStoreSalesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  paymentMethod: paymentMethodSchema.optional(),
  status: z.enum(["completed", "partially_returned", "returned", "voided"]).optional(),
  cashSession: objectIdSchema.optional(),
  seller: objectIdSchema.optional(),
});
export type ListStoreSalesQuery = z.infer<typeof listStoreSalesQuerySchema>;

export const storeSalesSummaryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type StoreSalesSummaryQuery = z.infer<typeof storeSalesSummaryQuerySchema>;
