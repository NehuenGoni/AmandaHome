import type {
  PaginatedResult,
  StoreDiscountType,
  StorePaymentMethod,
  StoreProductLookup,
  StoreSale,
  StoreSaleStatus,
  StoreSalesSummary,
} from "@amanda/shared";
import { apiGet, apiPost } from "./apiClient.js";

export interface StoreDiscountInput {
  type: StoreDiscountType;
  value: number;
}

export interface CreateStoreSaleInput {
  items: {
    productId: string;
    variantSku: string;
    quantity: number;
    discount?: StoreDiscountInput;
  }[];
  discount?: StoreDiscountInput;
  paymentMethod: StorePaymentMethod;
  cashReceived?: number;
  paymentReference?: string;
  customer?: { name?: string; email?: string };
  notes?: string;
}

export interface ReturnStoreSaleInput {
  items: { variantSku: string; quantity: number }[];
  refundMethod: StorePaymentMethod;
  reason?: string;
}

export interface ListStoreSalesParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  paymentMethod?: StorePaymentMethod;
  status?: StoreSaleStatus;
}

function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const createStoreSale = (input: CreateStoreSaleInput) =>
  apiPost<{ sale: StoreSale }>("/admin/store-sales", input);

export const listStoreSales = (params: ListStoreSalesParams = {}) =>
  apiGet<PaginatedResult<StoreSale>>(`/admin/store-sales${buildQuery(params)}`);

export const getStoreSale = (id: string) => apiGet<{ sale: StoreSale }>(`/admin/store-sales/${id}`);

export const getStoreSalesSummary = (params: { from?: string; to?: string } = {}) =>
  apiGet<{ summary: StoreSalesSummary }>(`/admin/store-sales/summary${buildQuery(params)}`);

export const lookupStoreProduct = (code: string) =>
  apiGet<{ result: StoreProductLookup }>(`/admin/store-sales/lookup${buildQuery({ code })}`);

export const voidStoreSale = (id: string, reason: string) =>
  apiPost<{ sale: StoreSale }>(`/admin/store-sales/${id}/void`, { reason });

export const returnStoreSaleItems = (id: string, input: ReturnStoreSaleInput) =>
  apiPost<{ sale: StoreSale }>(`/admin/store-sales/${id}/returns`, input);

export const emailStoreSale = (id: string, email: string) =>
  apiPost<{ sale: StoreSale }>(`/admin/store-sales/${id}/email`, { email });
