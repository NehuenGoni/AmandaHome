import type { PaginatedResult, SupplierPurchase } from "@amanda/shared";
import { apiGet, apiPost } from "./apiClient.js";

export interface SupplierPurchaseItemInput {
  productId: string;
  variantSku: string;
  quantity: number;
  unitCost: number;
}

export interface CreateSupplierPurchaseInput {
  supplierName: string;
  items: SupplierPurchaseItemInput[];
  purchaseDate?: string;
  notes?: string;
}

export const listSupplierPurchases = (page = 1, limit = 20) =>
  apiGet<PaginatedResult<SupplierPurchase>>(`/supplier-purchases?page=${page}&limit=${limit}`);

export const getSupplierPurchase = (id: string) =>
  apiGet<{ purchase: SupplierPurchase }>(`/supplier-purchases/${id}`);

export const createSupplierPurchase = (input: CreateSupplierPurchaseInput) =>
  apiPost<{ purchase: SupplierPurchase }>("/supplier-purchases", input);
