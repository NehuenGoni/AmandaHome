import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as cartApi from "@/lib/cartApi";
import { clearLocalCart, readLocalCart, writeLocalCart } from "@/lib/cartStorage";
import { EMPTY_CART, type CartItemView, type CartView } from "@/types/cart";
import { useAuth } from "./AuthContext";

function computeSubtotal(items: CartItemView[]): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0);
}

export interface AddCartItemInput {
  productId: string;
  variantSku: string;
  quantity: number;
  name: string;
  slug: string;
  image?: string;
  attributeName: string;
  attributeValue: string;
  unitPrice: number;
  availableStock: number;
}

function upsertLocalItem(items: CartItemView[], input: AddCartItemInput): CartItemView[] {
  const index = items.findIndex((i) => i.productId === input.productId && i.variantSku === input.variantSku);

  if (index >= 0) {
    const existing = items[index]!;
    const quantity = Math.min(existing.quantity + input.quantity, input.availableStock);
    const next = [...items];
    next[index] = { ...existing, quantity, subtotal: existing.unitPrice * quantity, availableStock: input.availableStock };
    return next;
  }

  const quantity = Math.min(input.quantity, input.availableStock);
  const newItem: CartItemView = {
    productId: input.productId,
    name: input.name,
    slug: input.slug,
    image: input.image,
    variantSku: input.variantSku,
    attributeName: input.attributeName,
    attributeValue: input.attributeValue,
    unitPrice: input.unitPrice,
    quantity,
    subtotal: input.unitPrice * quantity,
    availableStock: input.availableStock,
  };
  return [...items, newItem];
}

interface CartContextValue {
  cart: CartView;
  isLoading: boolean;
  addItem: (input: AddCartItemInput) => Promise<void>;
  updateQuantity: (productId: string, variantSku: string, quantity: number) => Promise<void>;
  removeItem: (productId: string, variantSku: string) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartView>(EMPTY_CART);
  const [isLoading, setIsLoading] = useState(true);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (authLoading) return; // esperamos a que AuthContext resuelva la sesión inicial

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        if (isAuthenticated && !wasAuthenticated.current) {
          // Recién autenticados (login/registro, o sesión recuperada al refrescar la página):
          // fusionamos cualquier resto del carrito local con el del backend.
          const localItems = readLocalCart();
          if (localItems.length > 0) {
            const merged = await cartApi.mergeCart(
              localItems.map((i) => ({ productId: i.productId, variantSku: i.variantSku, quantity: i.quantity })),
            );
            if (!cancelled) setCart(merged);
            clearLocalCart();
          } else {
            const remote = await cartApi.getCart();
            if (!cancelled) setCart(remote);
          }
        } else if (!isAuthenticated && wasAuthenticated.current) {
          // Logout: volvemos a un carrito local vacío, sin tocar el del backend.
          if (!cancelled) setCart(EMPTY_CART);
        } else if (!isAuthenticated) {
          const items = readLocalCart();
          if (!cancelled) setCart({ items, subtotal: computeSubtotal(items) });
        }
      } finally {
        if (!cancelled) {
          wasAuthenticated.current = isAuthenticated;
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  const addItem = useCallback(
    async (input: AddCartItemInput) => {
      if (isAuthenticated) {
        setCart(await cartApi.addItem(input.productId, input.variantSku, input.quantity));
      } else {
        setCart((prev) => {
          const items = upsertLocalItem(prev.items, input);
          writeLocalCart(items);
          return { items, subtotal: computeSubtotal(items) };
        });
      }
    },
    [isAuthenticated],
  );

  const updateQuantity = useCallback(
    async (productId: string, variantSku: string, quantity: number) => {
      if (isAuthenticated) {
        setCart(await cartApi.updateItemQuantity(productId, variantSku, quantity));
      } else {
        setCart((prev) => {
          const items = prev.items.map((item) =>
            item.productId === productId && item.variantSku === variantSku
              ? { ...item, quantity, subtotal: item.unitPrice * quantity }
              : item,
          );
          writeLocalCart(items);
          return { items, subtotal: computeSubtotal(items) };
        });
      }
    },
    [isAuthenticated],
  );

  const removeItem = useCallback(
    async (productId: string, variantSku: string) => {
      if (isAuthenticated) {
        setCart(await cartApi.removeItem(productId, variantSku));
      } else {
        setCart((prev) => {
          const items = prev.items.filter(
            (item) => !(item.productId === productId && item.variantSku === variantSku),
          );
          writeLocalCart(items);
          return { items, subtotal: computeSubtotal(items) };
        });
      }
    },
    [isAuthenticated],
  );

  const clear = useCallback(async () => {
    if (isAuthenticated) {
      await cartApi.clearCart();
    } else {
      clearLocalCart();
    }
    setCart(EMPTY_CART);
  }, [isAuthenticated]);

  const value = useMemo<CartContextValue>(
    () => ({ cart, isLoading, addItem, updateQuantity, removeItem, clear }),
    [cart, isLoading, addItem, updateQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
