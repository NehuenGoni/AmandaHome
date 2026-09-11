import type { PaginatedResult } from "@amanda/shared";
import type { FilterQuery } from "mongoose";
import { Category } from "../models/Category.js";
import { Product, type IProduct, type ProductDocument } from "../models/Product.js";
import { NotFoundError } from "../utils/AppError.js";
import type {
  AdminListProductsQuery,
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "../validators/productValidators.js";

function buildFilter(
  query: ListProductsQuery,
  { includeInactive }: { includeInactive: boolean },
): FilterQuery<IProduct> {
  const filter: FilterQuery<IProduct> = {};
  if (!includeInactive) filter.isActive = true;
  if (query.category) filter.category = query.category;
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured;
  if (query.tags?.length) filter.tags = { $in: query.tags };
  if (query.search) filter.$text = { $search: query.search };
  return filter;
}

async function paginate(
  filter: FilterQuery<IProduct>,
  query: ListProductsQuery,
): Promise<PaginatedResult<ProductDocument>> {
  const skip = (query.page - 1) * query.limit;
  const sort: Record<string, 1 | -1 | { $meta: string }> = query.search
    ? { score: { $meta: "textScore" } }
    : { createdAt: -1 };
  const projection = query.search ? { score: { $meta: "textScore" } } : undefined;

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
  return paginate(filter, query);
}

export async function getPublicProductBySlug(
  slug: string,
  viewerIsAdmin: boolean,
): Promise<ProductDocument> {
  const filter: FilterQuery<IProduct> = viewerIsAdmin ? { slug } : { slug, isActive: true };
  const product = await Product.findOne(filter);
  if (!product) throw new NotFoundError("Producto no encontrado");
  return product;
}

export async function listAdminProducts(
  query: AdminListProductsQuery,
): Promise<PaginatedResult<ProductDocument>> {
  const filter = buildFilter(query, { includeInactive: query.includeInactive });
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

export async function createProduct(input: CreateProductInput): Promise<ProductDocument> {
  await assertCategoryExists(input.category);
  return Product.create(input);
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ProductDocument> {
  const product = await getAdminProductById(id);

  if (input.category) {
    await assertCategoryExists(input.category);
  }

  Object.assign(product, input);
  await product.save();
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const product = await getAdminProductById(id);
  await product.deleteOne();
}
