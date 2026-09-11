import { z } from "zod";

export const mongoIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Identificador inválido"),
});
export type MongoIdParam = z.infer<typeof mongoIdParamSchema>;
