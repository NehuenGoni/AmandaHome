import { z } from "zod";
import { objectIdSchema } from "./commonValidators.js";

export const createCategorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().url("La imagen debe ser una URL válida").optional(),
  parent: objectIdSchema.nullable().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const reorderCategoriesSchema = z.object({
  items: z
    .array(
      z.object({
        id: objectIdSchema,
        order: z.number().int().min(0),
      }),
    )
    .min(1, "Debe incluir al menos un elemento"),
});
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;

export const listCategoriesQuerySchema = z.object({
  includeInactive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
