import type { Order, OrderStatus, PaginatedResult } from "@amanda/shared";
import { apiGet, apiPatch } from "./apiClient.js";

export interface AdminListOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  customer?: string;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
  note?: string;
  trackingNumber?: string;
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const listAdminOrders = (params: AdminListOrdersParams = {}) =>
  apiGet<PaginatedResult<Order>>(`/admin/orders${buildQuery(params as Record<string, unknown>)}`);

export const getAdminOrder = (id: string) => apiGet<{ order: Order }>(`/admin/orders/${id}`);

export const updateOrderStatus = (id: string, input: UpdateOrderStatusInput) =>
  apiPatch<{ order: Order }>(`/admin/orders/${id}/status`, input);
