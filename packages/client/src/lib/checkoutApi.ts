import type { Order } from "@amanda/shared";
import { apiPost } from "./apiClient.js";

export interface CreateCheckoutInput {
  addressId: string;
  shippingMethod: "pickup" | "standard" | "express";
  notes?: string;
}

export interface CheckoutResult {
  order: Order;
  checkoutUrl: string;
}

export const createCheckout = (input: CreateCheckoutInput) =>
  apiPost<CheckoutResult>("/checkout", input);
