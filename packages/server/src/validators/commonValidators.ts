import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Identificador inválido");

export const mongoIdParamSchema = z.object({
  id: objectIdSchema,
});
export type MongoIdParam = z.infer<typeof mongoIdParamSchema>;
