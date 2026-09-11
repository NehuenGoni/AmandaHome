import type { CartView } from "@/types/cart";
import { apiDelete, apiFetch, apiGet, apiPatch, apiPost } from "./apiClient.js";

export const getCart = () => apiGet<CartView>("/cart");

export const addItem = (productId: string, variantSku: string, quantity: number) =>
  apiPost<CartView>("/cart/items", { productId, variantSku, quantity });

export const updateItemQuantity = (productId: string, variantSku: string, quantity: number) =>
  apiPatch<CartView>(`/cart/items/${productId}/${variantSku}`, { quantity });

export const removeItem = (productId: string, variantSku: string) =>
  apiDelete<CartView>(`/cart/items/${productId}/${variantSku}`);

export const clearCart = () => apiDelete<void>("/cart");

export const mergeCart = (items: { productId: string; variantSku: string; quantity: number }[]) =>
  apiFetch<CartView>("/cart/merge", { method: "POST", body: { items } });
