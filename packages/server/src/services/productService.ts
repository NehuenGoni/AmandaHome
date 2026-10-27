import type { PaginatedResult } from "@amanda/shared";
import type { FilterQuery, Types } from "mongoose";
import { runInTransaction } from "../config/db.js";
import { Category } from "../models/Category.js";
import { Product, type IProduct, type IProductVariant, type ProductDocument } from "../models/Product.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/AppError.js";
import { recordMovements } from "./inventoryService.js";
import type {
  AdminListProductsQuery,
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "../validators/productValidators.js";

/** El costo es un dato interno: nunca sale en las respuestas públicas. */
const PUBLIC_PROJECTION = { "variants.costPrice": 0 } as const;

function buildFilter(
  query: ListProductsQuery,
  { includeInactive, archived = false }: { includeInactive: boolean; archived?: boolean },
): FilterQuery<IProduct> {
  const filter: FilterQuery<IProduct> = {};
  if (!includeInactive) filter.isActive = true;
  filter.archivedAt = { $exists: archived };
  if (query.category) filter.category = query.category;
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured;
  if (query.tags?.length) filter.tags = { $in: query.tags };
  if (query.search) filter.$text = { $search: query.search };
  return filter;
}

async function paginate(
  filter: FilterQuery<IProduct>,
  query: ListProductsQuery,
  baseProjection?: typeof PUBLIC_PROJECTION,
): Promise<PaginatedResult<ProductDocument>> {
  const skip = (query.page - 1) * query.limit;
  const sort: Record<string, 1 | -1 | { $meta: string }> = query.search
    ? { score: { $meta: "textScore" } }
    : { createdAt: -1 };
  const projection = query.search
    ? { ...baseProjection, score: { $meta: "textScore" } }
    : baseProjection;

  const [items, total] = await Promise.all([
    Product.find(filter, projection).sort(sort).skip(skip).limit(query.limit),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function listPublicProducts(
  query: ListProductsQuery,
  viewerIsAdmin: boolean,
): Promise<PaginatedResult<ProductDocument>> {
  const filter = buildFilter(query, { includeInactive: viewerIsAdmin });
  return paginate(filter, query, PUBLIC_PROJECTION);
}

export async function getPublicProductBySlug(
  slug: string,
  viewerIsAdmin: boolean,
): Promise<ProductDocument> {
  const filter: FilterQuery<IProduct> = viewerIsAdmin ? { slug } : { slug, isActive: true };
  const product = await Product.findOne(filter, PUBLIC_PROJECTION);
  if (!product || product.archivedAt) throw new NotFoundError("Producto no encontrado");
  return product;
}

export async function listAdminProducts(
  query: AdminListProductsQuery,
): Promise<PaginatedResult<ProductDocument>> {
  const filter = buildFilter(query, { includeInactive: query.includeInactive, archived: query.archived });
  return paginate(filter, query);
}

export async function getAdminProductById(id: string): Promise<ProductDocument> {
  const product = await Product.findById(id);
  if (!product) throw new NotFoundError("Producto no encontrado");
  return product;
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  const exists = await Category.exists({ _id: categoryId });
  if (!exists) throw new NotFoundError("Categoría no encontrada");
}

export async function createProduct(
  input: CreateProductInput,
  adminId: string,
): Promise<ProductDocument> {
  await assertCategoryExists(input.category);

  // El stock inicial también deja constancia en el log de movimientos.
  return runInTransaction(async (session) => {
    const [product] = await Product.create([input], { session });
    await recordMovements(
      product!.variants
        .filter((variant) => variant.stock > 0)
        .map((variant) => ({
          product: product!._id.toString(),
          variantSku: variant.sku,
          quantity: variant.stock,
          previousStock: 0,
          newStock: variant.stock,
        })),
      { type: "adjustment", note: "Stock inicial", createdBy: adminId },
      session,
    );
    return product!;
  });
}

/**
 * El stock nunca se edita desde acá: las variantes existentes (por SKU) conservan el
 * que tienen en la base y las nuevas arrancan en 0. Corre en una transacción para no
 * pisar una venta concurrente (un conflicto de escritura se reintenta).
 */
export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ProductDocument> {
  if (input.category) {
    await assertCategoryExists(input.category);
  }

  return runInTransaction(async (session) => {
    const product = await Product.findById(id).session(session);
    if (!product) throw new NotFoundError("Producto no encontrado");
    if (product.archivedAt && input.isActive) {
      throw new ConflictError("El producto está archivado: restauralo antes de activarlo");
    }

    const { variants, ...rest } = input;
    Object.assign(product, rest);

    if (variants) {
      const nextSkus = new Set(variants.map((v) => v.sku.trim().toUpperCase()));
      const removedWithStock = product.variants.find((v) => !nextSkus.has(v.sku) && v.stock > 0);
      if (removedWithStock) {
        throw new BadRequestError(
          `La variante ${removedWithStock.sku} tiene stock: ajustalo a 0 desde Inventario antes de quitarla o cambiarle el SKU`,
        );
      }

      const existingBySku = new Map(
        (product.variants as Array<IProductVariant & { _id?: Types.ObjectId }>).map((v) => [v.sku, v]),
      );
      product.set(
        "variants",
        variants.map((v) => {
          const sku = v.sku.trim().toUpperCase();
          const existing = existingBySku.get(sku);
          return { ...v, sku, _id: existing?._id, stock: existing?.stock ?? 0 };
        }),
      );
    }

    await product.save({ session });
    return product;
  });
}

/** Baja lógica: el producto queda inactivo y oculto del admin, pero se conserva para el historial. */
export async function archiveProduct(id: string): Promise<void> {
  const result = await Product.updateOne(
    { _id: id },
    { $set: { archivedAt: new Date(), isActive: false } },
  );
  if (result.matchedCount === 0) throw new NotFoundError("Producto no encontrado");
}

/** Restaura un producto archivado; queda inactivo para que el admin lo revise antes de publicarlo. */
export async function restoreProduct(id: string): Promise<ProductDocument> {
  const product = await Product.findOneAndUpdate(
    { _id: id },
    { $unset: { archivedAt: "" }, $set: { isActive: false } },
    { new: true },
  );
  if (!product) throw new NotFoundError("Producto no encontrado");
  return product;
}
