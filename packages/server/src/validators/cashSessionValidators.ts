import { z } from "zod";

export const openCashSessionSchema = z.object({
  openingAmount: z.number().int("El monto debe estar en centavos").nonnegative(),
});
export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>;

export const cashMovementSchema = z.object({
  type: z.enum(["in", "out"]),
  amount: z.number().int("El monto debe estar en centavos").positive("El monto debe ser mayor a 0"),
  reason: z.string().trim().min(1, "El motivo es requerido").max(200),
});
export type CashMovementInput = z.infer<typeof cashMovementSchema>;

export const closeCashSessionSchema = z.object({
  countedCash: z.number().int("El monto debe estar en centavos").nonnegative(),
  notes: z.string().trim().max(500).optional(),
});
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>;

export const listCashSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListCashSessionsQuery = z.infer<typeof listCashSessionsQuerySchema>;
