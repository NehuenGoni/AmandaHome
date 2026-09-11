export type StockMovementType =
  | "purchase_in"
  | "sale_out"
  | "adjustment"
  | "return";

/**
 * Log de auditoría inmutable: nunca se edita ni se borra un movimiento,
 * solo se generan nuevos para corregir el stock.
 */
export interface StockMovement {
  _id: string;
  product: string;
  variantSku: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string;
  note?: string;
  /** Ausente en movimientos automáticos del sistema (venta, reposición por cancelación). */
  createdBy?: string;
  createdAt: string;
}
