export type StorePaymentMethod = "cash" | "debit" | "credit" | "transfer";

export const STORE_PAYMENT_METHODS: readonly StorePaymentMethod[] = [
  "cash",
  "debit",
  "credit",
  "transfer",
];

export type StoreSaleStatus = "completed" | "partially_returned" | "returned" | "voided";

export type StoreDiscountType = "percent" | "amount";

export interface StoreSaleItem {
  product: string;
  productName: string;
  variantSku: string;
  attributeName: string;
  attributeValue: string;
  image?: string;
  /** Centavos, tomado del catálogo al momento de la venta. */
  unitPrice: number;
  quantity: number;
  /** Centavos descontados sobre el total de la línea. */
  discount: number;
  /** unitPrice * quantity - discount, en centavos. */
  subtotal: number;
}

export interface StoreSaleDiscount {
  type: StoreDiscountType;
  /** Porcentaje (0-100) o centavos, según `type`. */
  value: number;
  /** Monto efectivamente descontado, en centavos. */
  amount: number;
}

/**
 * Datos fiscales de ARCA/AFIP. Vacíos mientras la facturación electrónica no
 * esté integrada: la venta queda lista para facturarse más adelante.
 */
export interface StoreSaleFiscalReceipt {
  type?: string;
  pointOfSale?: number;
  number?: number;
  cae?: string;
  caeExpiresAt?: string;
  status?: "pending" | "issued" | "rejected";
  issuedAt?: string;
}

export interface StoreSaleReturnItem {
  variantSku: string;
  quantity: number;
  /** Centavos reintegrados por este ítem (con el descuento global prorrateado). */
  amount: number;
}

export interface StoreSaleReturn {
  _id: string;
  items: StoreSaleReturnItem[];
  amount: number;
  refundMethod: StorePaymentMethod;
  /** Caja desde la que salió el reintegro. */
  cashSession: string;
  reason?: string;
  createdBy: string;
  createdAt: string;
  creditNote?: StoreSaleFiscalReceipt;
}

export interface StoreSale {
  _id: string;
  saleNumber: number;
  cashSession: string;
  seller: string;
  items: StoreSaleItem[];
  subtotal: number;
  discount?: StoreSaleDiscount;
  total: number;
  paymentMethod: StorePaymentMethod;
  /** Solo efectivo. */
  cashReceived?: number;
  change?: number;
  /** Nº de cupón del posnet o de la transferencia. */
  paymentReference?: string;
  /** Mongoose omite el subdocumento al serializar si no se cargó nombre ni email. */
  customer?: { name?: string; email?: string };
  notes?: string;
  status: StoreSaleStatus;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  returns: StoreSaleReturn[];
  emailSentTo: string[];
  fiscalReceipt?: StoreSaleFiscalReceipt;
  createdAt: string;
}

export interface StoreSalesSummary {
  from: string;
  to: string;
  count: number;
  total: number;
  byMethod: Record<StorePaymentMethod, { count: number; total: number }>;
}

/** Resultado de buscar una variante por código de barras o SKU en el punto de venta. */
export interface StoreProductLookup {
  productId: string;
  productName: string;
  image?: string;
  variantSku: string;
  attributeName: string;
  attributeValue: string;
  price: number;
  stock: number;
  barcode?: string;
}
