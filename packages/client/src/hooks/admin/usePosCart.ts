import { useMemo, useReducer } from "react";
import { EMPTY_POS_CART, computePosTotals, posCartReducer } from "@/lib/posCart";

/** Carrito local del punto de venta: nada de CartContext, que está atado al carrito online del usuario. */
export function usePosCart() {
  const [state, dispatch] = useReducer(posCartReducer, EMPTY_POS_CART);
  const totals = useMemo(() => computePosTotals(state), [state]);
  return { state, totals, dispatch };
}
