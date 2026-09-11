import type { PaginatedResult, Product } from "@amanda/shared";
import { apiDelete, apiGet, apiPatch, apiPost } from "./apiClient.js";

export interface AdminListProductsParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  isFeatured?: boolean;
  includeInactive?: boolean;
}

export interface ProductVariantInput {
  sku: string;
  attributeName: string;
  attributeValue: string;
  price: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  weight?: number;
  barcode?: string;
}

export interface ProductImageInput {
  url: string;
  source: "cloudinary" | "external";
  alt?: string;
  order: number;
}

export interface ProductInput {
  name: string;
  slug?: string;
  description?: string;
  category: string;
  brand?: string;
  tags: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  images: ProductImageInput[];
  variants: ProductVariantInput[];
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const listAdminProducts = (params: AdminListProductsParams = {}) =>
  apiGet<PaginatedResult<Product>>(`/admin/products${buildQuery(params as Record<string, unknown>)}`);

export const getAdminProduct = (id: string) => apiGet<{ product: Product }>(`/admin/products/${id}`);

export const createProduct = (input: ProductInput) =>
  apiPost<{ product: Product }>("/admin/products", input);

export const updateProduct = (id: string, input: Partial<ProductInput>) =>
  apiPatch<{ product: Product }>(`/admin/products/${id}`, input);

export const deleteProduct = (id: string) => apiDelete<void>(`/admin/products/${id}`);

export const signProductImageUpload = () =>
  apiPost<{ signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string }>(
    "/uploads/products/sign",
  );
