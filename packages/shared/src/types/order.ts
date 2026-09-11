import type { WithTimestamps } from "./common.js";
import type { Address } from "./user.js";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "refunded"
  | "cancelled";

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  changedAt: string;
  changedBy?: string;
  note?: string;
}

/**
 * Snapshot inmutable de la variante al momento de compra: los datos del
 * producto pueden cambiar después sin afectar órdenes ya creadas.
 */
export interface OrderItem {
  product: string;
  productName: string;
  variantSku: string;
  attributeName: string;
  attributeValue: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export type ShippingAddressSnapshot = Omit<Address, "_id" | "isDefault">;

export interface Order extends WithTimestamps {
  _id: string;
  orderNumber: number;
  customer: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  statusHistory: OrderStatusHistoryEntry[];
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paymentDetails?: Record<string, unknown>;
  shippingMethod: string;
  shippingAddress: ShippingAddressSnapshot;
  trackingNumber?: string;
  notes?: string;
}
