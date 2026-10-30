import type { Order } from "@amanda/shared";
import { apiPost } from "./apiClient.js";

export interface CreateCheckoutInput {
  addressId?: string;
  /** Tal como vino en la cotización: "pickup", "home:CP", "branch:EP", etc. */
  shippingOptionId: string;
  /** Solo para retiro en sucursal. */
  agencyCode?: string;
  provinceCode?: string;
  expectedShippingCost: number;
  notes?: string;
}

export interface CheckoutResult {
  order: Order;
  checkoutUrl: string;
}

export const createCheckout = (input: CreateCheckoutInput) =>
  apiPost<CheckoutResult>("/checkout", input);
