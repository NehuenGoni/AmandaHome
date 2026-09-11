import { z } from "zod";
import { objectIdSchema } from "./commonValidators.js";

const imageSchema = z.object({
  url: z.string().url("La imagen debe ser una URL válida"),
  source: z.enum(["cloudinary", "external"]),
  alt: z.string().optional(),
  order: z.number().int().min(0).default(0),
});

const variantSchema = z.object({
  sku: z.string().min(1, "El SKU es requerido"),
  attributeName: z.string().min(1, "El nombre del atributo es requerido"),
  attributeValue: z.string().min(1, "El valor del atributo es requerido"),
  price: z.number().int("El precio debe estar en centavos").nonnegative(),
  costPrice: z.number().int("El costo debe estar en centavos").nonnegative(),
  stock: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(0),
  weight: z.number().nonnegative().optional(),
  barcode: z.string().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  slug: z.string().optional(),
  description: z.string().optional(),
  category: objectIdSchema,
  brand: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  images: z.array(imageSchema).default([]),
  variants: z.array(variantSchema).min(1, "El producto debe tener al menos una variante"),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: objectIdSchema.optional(),
  search: z.string().optional(),
  isFeatured: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  tags: z
    .string()
    .optional()
    .transform((value) => value?.split(",").map((t) => t.trim()).filter(Boolean)),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const adminListProductsQuerySchema = listProductsQuerySchema.extend({
  includeInactive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});
export type AdminListProductsQuery = z.infer<typeof adminListProductsQuerySchema>;
