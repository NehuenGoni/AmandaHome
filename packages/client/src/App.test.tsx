import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as authApi from "@/lib/authApi";
import * as cartApi from "@/lib/cartApi";
import * as categoriesApi from "@/lib/categoriesApi";
import * as productsApi from "@/lib/productsApi";
import App from "./App.js";
import { AuthProvider } from "./contexts/AuthContext.js";
import { CartProvider } from "./contexts/CartContext.js";

vi.mock("@/lib/authApi");
vi.mock("@/lib/cartApi");
vi.mock("@/lib/productsApi");
vi.mock("@/lib/categoriesApi");

vi.mocked(authApi.refresh).mockRejectedValue(new Error("sin sesión"));
vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], subtotal: 0 });
vi.mocked(productsApi.listProducts).mockResolvedValue({ items: [], total: 0, page: 1, limit: 8, totalPages: 1 });
vi.mocked(categoriesApi.listCategories).mockResolvedValue({ categories: [] });

function renderApp() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>,
  );
}

describe("App", () => {
  it("muestra el header y el título de la home", async () => {
    renderApp();

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Objetos con carácter para tu casa",
    );
  });

  it("muestra el link de ingresar cuando no hay sesión", async () => {
    renderApp();

    const links = await screen.findAllByRole("link", { name: "Ingresar" });
    expect(links.length).toBeGreaterThan(0);
  });

  it("redirige a /login si un usuario sin sesión intenta entrar a /admin", async () => {
    window.history.pushState({}, "", "/admin");
    renderApp();

    expect(await screen.findByRole("heading", { level: 1, name: "Ingresá a tu cuenta" })).toBeInTheDocument();
    window.history.pushState({}, "", "/");
  });

  it("redirige a la home si un cliente sin permisos de administrador intenta entrar a /admin", async () => {
    vi.mocked(authApi.refresh).mockResolvedValueOnce({ accessToken: "token-1" });
    vi.mocked(authApi.getMe).mockResolvedValueOnce({
      user: {
        _id: "1",
        email: "cliente@example.com",
        firstName: "Cliente",
        lastName: "Ejemplo",
        role: "customer",
        addresses: [],
        isActive: true,
        createdAt: "",
        updatedAt: "",
      },
    });
    window.history.pushState({}, "", "/admin");
    renderApp();

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Objetos con carácter para tu casa",
    );
    window.history.pushState({}, "", "/");
  });
});
