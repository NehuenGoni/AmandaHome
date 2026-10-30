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
 * Se levanta cuando llega un pago aprobado para un pedido que ya está
 * cancelado (por vencimiento o por un admin). Un admin debe resolverlo a
 * mano: reactivar el pedido (si hay stock) o devolver la plata.
 */
export interface OrderPaymentIssue {
  reason: "approved_on_cancelled";
  paymentId: string;
  flaggedAt: string;
  resolvedAt?: string;
  resolution?: "reactivated" | "refunded";
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

export interface OrderShippingAgency {
  code: string;
  name: string;
  address: string;
  postalCode: string;
  provinceCode: string;
}

/** Detalle de la cotización de envío por correo (Correo Argentino), guardado al confirmar la orden. */
export interface OrderShippingDetails {
  carrier: string;
  /** "CP" (Clásico) o "EP" (Expreso). Ausente en pedidos viejos: se tratan como Clásico. */
  service?: string;
  /** Sucursal de Correo elegida, solo si `shippingMethod` es "branch". */
  agency?: OrderShippingAgency;
  etaMinDays?: number;
  etaMaxDays?: number;
  quotedAt: string;
  /** Cuándo se cargó el envío en MiCorreo para generar la etiqueta (automático al aprobarse el pago). */
  carrierImportedAt?: string;
  /** Último error al cargar el envío en MiCorreo; se limpia cuando la carga sale bien. */
  carrierImportError?: string;
  /** Si el costo se calculó con el precio de respaldo porque el correo no pudo cotizar. */
  isFallback?: boolean;
  /** Paquete usado para cotizar (gramos/cm), reutilizado al despachar sin tener que recalcularlo. */
  packageWeight?: number;
  packageHeight?: number;
  packageWidth?: number;
  packageLength?: number;
}

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
  /**
   * Claves usadas: `preferenceId`, `initPoint` y `expiresAt` (link de pago
   * vigente) y `paymentId`, `mpStatus`, `mpStatusDetail` (última
   * notificación de Mercado Pago procesada).
   */
  paymentDetails?: Record<string, unknown>;
  paymentIssue?: OrderPaymentIssue;
  shippingMethod: string;
  /** Ausente cuando `shippingMethod` es "pickup" o "branch": no hace falta una dirección del cliente. */
  shippingAddress?: ShippingAddressSnapshot;
  shippingDetails?: OrderShippingDetails;
  trackingNumber?: string;
  notes?: string;
  receiptUrl?: string;
}
