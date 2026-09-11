import type { CartItemView } from "@/types/cart";

const STORAGE_KEY = "amanda:cart";

/** localStorage puede no estar disponible (modo privado, cuota agotada): el carrito local simplemente no persiste. */
export function readLocalCart(): CartItemView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItemView[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalCart(items: CartItemView[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignorado a propósito
  }
}

export function clearLocalCart(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorado a propósito
  }
}
