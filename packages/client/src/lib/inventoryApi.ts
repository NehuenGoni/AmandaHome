import type { PaginatedResult, StockMovement, StockMovementType } from "@amanda/shared";
import { apiGet, apiPost } from "./apiClient.js";

export interface AdjustStockInput {
  productId: string;
  variantSku: string;
  quantityChange: number;
  note?: string;
}

export interface ListMovementsParams {
  page?: number;
  limit?: number;
  product?: string;
  variantSku?: string;
  type?: StockMovementType;
}

export interface LowStockVariant {
  productId: string;
  productName: string;
  variantSku: string;
  attributeName: string;
  attributeValue: string;
  stock: number;
  lowStockThreshold: number;
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const adjustStock = (input: AdjustStockInput) =>
  apiPost<{ movement: StockMovement }>("/inventory/adjustments", input);

export const listMovements = (params: ListMovementsParams = {}) =>
  apiGet<PaginatedResult<StockMovement>>(`/inventory/movements${buildQuery(params as Record<string, unknown>)}`);

export const listLowStock = () => apiGet<{ items: LowStockVariant[] }>("/inventory/low-stock");
