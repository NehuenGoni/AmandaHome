/** Espejo del `EnrichedCart` que devuelve el backend, compartido por el modo local y el autenticado. */
export interface CartItemView {
  productId: string;
  name: string;
  slug: string;
  image?: string;
  variantSku: string;
  attributeName: string;
  attributeValue: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  availableStock: number;
}

export interface CartView {
  items: CartItemView[];
  subtotal: number;
}

export const EMPTY_CART: CartView = { items: [], subtotal: 0 };
