import type { PaginatedResult, Product } from "@amanda/shared";
import { apiGet } from "./apiClient.js";

export interface ListProductsParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  isFeatured?: boolean;
  tags?: string;
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const listProducts = (params: ListProductsParams = {}) =>
  apiGet<PaginatedResult<Product>>(`/products${buildQuery(params as Record<string, unknown>)}`);

export const getProductBySlug = (slug: string) => apiGet<{ product: Product }>(`/products/${slug}`);
