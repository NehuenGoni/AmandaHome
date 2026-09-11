import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as authApi from "@/lib/authApi";
import * as categoriesApi from "@/lib/categoriesApi";
import * as productsApi from "@/lib/productsApi";
import App from "./App.js";
import { AuthProvider } from "./contexts/AuthContext.js";
import { CartProvider } from "./contexts/CartContext.js";

vi.mock("@/lib/authApi");
vi.mock("@/lib/productsApi");
vi.mock("@/lib/categoriesApi");

vi.mocked(authApi.refresh).mockRejectedValue(new Error("sin sesión"));
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
});
