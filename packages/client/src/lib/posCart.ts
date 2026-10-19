import { percentageOfCents, sumCents, type StoreProductLookup } from "@amanda/shared";
import type { StoreDiscountInput } from "./storeSalesApi";

export interface PosLine {
  productId: string;
  productName: string;
  image?: string;
  variantSku: string;
  attributeName: string;
  attributeValue: string;
  /** Centavos. Solo para mostrar: el servidor siempre recalcula con el precio del catálogo. */
  unitPrice: number;
  stock: number;
  quantity: number;
  discount?: StoreDiscountInput;
}

export interface PosCartState {
  lines: PosLine[];
  discount?: StoreDiscountInput;
}

export type PosCartAction =
  | { type: "add"; product: StoreProductLookup }
  | { type: "setQuantity"; variantSku: string; quantity: number }
  | { type: "setLineDiscount"; variantSku: string; discount?: StoreDiscountInput }
  | { type: "setDiscount"; discount?: StoreDiscountInput }
  | { type: "remove"; variantSku: string }
  | { type: "clear" };

export const EMPTY_POS_CART: PosCartState = { lines: [] };

export function posCartReducer(state: PosCartState, action: PosCartAction): PosCartState {
  switch (action.type) {
    case "add": {
      const { product } = action;
      if (product.stock <= 0) return state;
      const existing = state.lines.find((l) => l.variantSku === product.variantSku);
      if (existing) {
        // Escanear de nuevo suma una unidad, sin pasar el stock disponible.
        return {
          ...state,
          lines: state.lines.map((l) =>
            l.variantSku === product.variantSku
              ? { ...l, stock: product.stock, quantity: Math.min(l.quantity + 1, product.stock) }
              : l,
          ),
        };
      }
      return {
        ...state,
        lines: [
          ...state.lines,
          {
            productId: product.productId,
            productName: product.productName,
            image: product.image,
            variantSku: product.variantSku,
            attributeName: product.attributeName,
            attributeValue: product.attributeValue,
            unitPrice: product.price,
            stock: product.stock,
            quantity: 1,
          },
        ],
      };
    }
    case "setQuantity":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.variantSku === action.variantSku
            ? { ...l, quantity: Math.max(1, Math.min(action.quantity, l.stock)) }
            : l,
        ),
      };
    case "setLineDiscount":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.variantSku === action.variantSku ? { ...l, discount: action.discount } : l,
        ),
      };
    case "setDiscount":
      return { ...state, discount: action.discount };
    case "remove":
      return { ...state, lines: state.lines.filter((l) => l.variantSku !== action.variantSku) };
    case "clear":
      return EMPTY_POS_CART;
  }
}

/** Descuento en centavos sobre `base`, acotado a ese importe (el servidor rechaza uno mayor). */
export function discountAmount(base: number, discount?: StoreDiscountInput): number {
  if (!discount || discount.value <= 0) return 0;
  const amount =
    discount.type === "percent"
      ? percentageOfCents(base, Math.min(discount.value, 100))
      : Math.round(discount.value);
  return Math.min(amount, base);
}

export interface PosLineTotals {
  gross: number;
  discount: number;
  subtotal: number;
}

export interface PosCartTotals {
  lines: Record<string, PosLineTotals>;
  subtotal: number;
  discount: number;
  total: number;
  units: number;
}

export function computePosTotals(state: PosCartState): PosCartTotals {
  const lines: Record<string, PosLineTotals> = {};
  for (const line of state.lines) {
    const gross = line.unitPrice * line.quantity;
    const discount = discountAmount(gross, line.discount);
    lines[line.variantSku] = { gross, discount, subtotal: gross - discount };
  }
  const subtotal = sumCents(...Object.values(lines).map((l) => l.subtotal));
  const discount = discountAmount(subtotal, state.discount);
  return {
    lines,
    subtotal,
    discount,
    total: subtotal - discount,
    units: state.lines.reduce((n, l) => n + l.quantity, 0),
  };
}
