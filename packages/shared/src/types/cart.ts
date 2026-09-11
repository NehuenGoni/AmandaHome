export interface CartItem {
  product: string;
  variantSku: string;
  quantity: number;
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  updatedAt: string;
}

/** Ítem de carrito persistido localmente para usuarios anónimos. */
export interface LocalCartItem extends CartItem {
  addedAt: string;
}
