import { z } from "zod";

export const createWithdrawalSchema = z.object({
  orderNumber: z.coerce.number().int("Número de pedido inválido").positive("Número de pedido inválido"),
  email: z.string().email("Email inválido"),
  fullName: z.string().trim().min(1, "El nombre es requerido").max(120),
  reason: z.string().trim().max(1000).optional(),
});
export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;
