import type { StorePaymentMethod, StoreSaleStatus } from "@amanda/shared";

export const PAYMENT_METHOD_LABELS: Record<StorePaymentMethod, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia / QR",
};

export const STORE_SALE_STATUS_LABELS: Record<StoreSaleStatus, string> = {
  completed: "Completada",
  partially_returned: "Devolución parcial",
  returned: "Devuelta",
  voided: "Anulada",
};

export const STORE_SALE_STATUS_TONES: Record<
  StoreSaleStatus,
  "support" | "warning" | "neutral" | "danger"
> = {
  completed: "support",
  partially_returned: "warning",
  returned: "neutral",
  voided: "danger",
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
