import type { StorePaymentMethod } from "./storeSale.js";

export type CashSessionStatus = "open" | "closed";

export type CashMovementType = "in" | "out";

export interface CashMovement {
  _id: string;
  type: CashMovementType;
  /** Centavos, siempre positivo: el signo lo da `type`. */
  amount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface CashSessionTotals {
  salesByMethod: Record<StorePaymentMethod, number>;
  refundsByMethod: Record<StorePaymentMethod, number>;
  salesCount: number;
  cashIn: number;
  cashOut: number;
  /** Apertura + ventas en efectivo - devoluciones en efectivo + ingresos - egresos. */
  expectedCash: number;
}

export interface CashSession {
  _id: string;
  status: CashSessionStatus;
  openedBy: string;
  openedAt: string;
  openingAmount: number;
  movements: CashMovement[];
  closedBy?: string;
  closedAt?: string;
  countedCash?: number;
  /** countedCash - expectedCash: negativo = faltante. */
  difference?: number;
  notes?: string;
  /** Resumen en vivo si está abierta; snapshot definitivo si está cerrada. */
  totals: CashSessionTotals;
}
