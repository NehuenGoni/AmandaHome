import { z } from "zod";
import { objectIdSchema } from "./commonValidators.js";

const purchaseItemSchema = z.object({
  productId: objectIdSchema,
  variantSku: z.string().min(1, "El SKU es requerido"),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
  unitCost: z.number().int("El costo debe estar en centavos").nonnegative(),
});

export const createSupplierPurchaseSchema = z.object({
  supplierName: z.string().min(1, "El proveedor es requerido"),
  items: z.array(purchaseItemSchema).min(1, "La compra debe tener al menos un ítem"),
  purchaseDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export type CreateSupplierPurchaseInput = z.infer<typeof createSupplierPurchaseSchema>;

export const listSupplierPurchasesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListSupplierPurchasesQuery = z.infer<typeof listSupplierPurchasesQuerySchema>;
