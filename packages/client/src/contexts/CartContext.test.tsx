import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "@/lib/authApi";
import * as cartApi from "@/lib/cartApi";
import { AuthProvider, useAuth } from "./AuthContext.js";
import { CartProvider, useCart } from "./CartContext.js";

vi.mock("@/lib/authApi");
vi.mock("@/lib/cartApi");

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}

function useAuthAndCart() {
  return { auth: useAuth(), cart: useCart() };
}

const sampleItemInput = {
  productId: "prod-1",
  variantSku: "SKU-1",
  quantity: 2,
  name: "Vela",
  slug: "vela",
  attributeName: "Color",
  attributeValue: "Verde",
  unitPrice: 250000,
  availableStock: 5,
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.mocked(authApi.refresh).mockRejectedValue(new Error("sin sesión"));
});

describe("CartProvider en modo anónimo", () => {
  it("agrega un ítem y lo persiste en localStorage", async () => {
    const { result } = renderHook(() => useAuthAndCart(), { wrapper });
    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));

    await act(async () => {
      await result.current.cart.addItem(sampleItemInput);
    });

    expect(result.current.cart.cart.items).toHaveLength(1);
    expect(result.current.cart.cart.subtotal).toBe(500000);
    expect(localStorage.getItem("amanda:cart")).toContain("SKU-1");
  });

  it("suma cantidades y respeta el stock disponible al agregar dos veces", async () => {
    const { result } = renderHook(() => useAuthAndCart(), { wrapper });
    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));

    await act(async () => {
      await result.current.cart.addItem(sampleItemInput);
      await result.current.cart.addItem({ ...sampleItemInput, quantity: 10 });
    });

    expect(result.current.cart.cart.items[0]?.quantity).toBe(5); // clamp a availableStock
  });

  it("actualiza y elimina ítems localmente", async () => {
    const { result } = renderHook(() => useAuthAndCart(), { wrapper });
    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));

    await act(async () => {
      await result.current.cart.addItem(sampleItemInput);
    });
    await act(async () => {
      await result.current.cart.updateQuantity("prod-1", "SKU-1", 4);
    });
    expect(result.current.cart.cart.items[0]?.quantity).toBe(4);

    await act(async () => {
      await result.current.cart.removeItem("prod-1", "SKU-1");
    });
    expect(result.current.cart.cart.items).toHaveLength(0);
  });
});

describe("CartProvider al autenticarse", () => {
  it("fusiona el carrito local con el del backend y limpia localStorage", async () => {
    const { result } = renderHook(() => useAuthAndCart(), { wrapper });
    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));

    await act(async () => {
      await result.current.cart.addItem(sampleItemInput);
    });
    expect(localStorage.getItem("amanda:cart")).not.toBeNull();

    const mergedCart = { items: [{ ...sampleItemInput, subtotal: 500000 }], subtotal: 500000 };
    vi.mocked(cartApi.mergeCart).mockResolvedValue(mergedCart);
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: "token-1",
      user: {
        _id: "1",
        email: "cliente@example.com",
        firstName: "Cliente",
        lastName: "Test",
        role: "customer",
        addresses: [],
        isActive: true,
        createdAt: "",
        updatedAt: "",
      },
    });

    await act(async () => {
      await result.current.auth.login("cliente@example.com", "password123");
    });

    await waitFor(() => expect(cartApi.mergeCart).toHaveBeenCalledTimes(1));
    expect(cartApi.mergeCart).toHaveBeenCalledWith([{ productId: "prod-1", variantSku: "SKU-1", quantity: 2 }]);
    expect(localStorage.getItem("amanda:cart")).toBeNull();
  });

  it("cuando no hay carrito local, obtiene el carrito remoto directamente", async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: "token-1" });
    vi.mocked(authApi.getMe).mockResolvedValue({
      user: {
        _id: "1",
        email: "cliente@example.com",
        firstName: "Cliente",
        lastName: "Test",
        role: "customer",
        addresses: [],
        isActive: true,
        createdAt: "",
        updatedAt: "",
      },
    });
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], subtotal: 0 });

    const { result } = renderHook(() => useAuthAndCart(), { wrapper });
    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));
    await waitFor(() => expect(result.current.cart.isLoading).toBe(false));

    expect(cartApi.getCart).toHaveBeenCalledTimes(1);
    expect(cartApi.mergeCart).not.toHaveBeenCalled();
  });
});
