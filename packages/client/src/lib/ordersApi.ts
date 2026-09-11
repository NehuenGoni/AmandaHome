import type { Order, PaginatedResult } from "@amanda/shared";
import { apiGet, apiPatch, apiPost } from "./apiClient.js";

export const listMyOrders = (page = 1, limit = 10) =>
  apiGet<PaginatedResult<Order>>(`/orders?page=${page}&limit=${limit}`);

export const getMyOrder = (id: string) => apiGet<{ order: Order }>(`/orders/${id}`);

export const attachReceipt = (id: string, receiptUrl: string) =>
  apiPatch<{ order: Order }>(`/orders/${id}/receipt`, { receiptUrl });

export const signReceiptUpload = (orderId: string) =>
  apiPost<{ signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string }>(
    `/uploads/receipts/${orderId}/sign`,
  );
