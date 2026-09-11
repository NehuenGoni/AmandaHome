import type { Product } from "@amanda/shared";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProductCard } from "./ProductCard.js";

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    _id: "1",
    name: "Vela Aromática",
    slug: "vela-aromatica",
    category: "cat-1",
    tags: [],
    isActive: true,
    isFeatured: false,
    images: [],
    variants: [
      {
        sku: "VELA-1",
        attributeName: "Color",
        attributeValue: "Verde",
        price: 250000,
        costPrice: 100000,
        stock: 5,
        lowStockThreshold: 1,
      },
    ],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function renderCard(product: Product) {
  return render(
    <BrowserRouter>
      <ProductCard product={product} />
    </BrowserRouter>,
  );
}

describe("ProductCard", () => {
  it("muestra el nombre y el precio del producto", () => {
    renderCard(buildProduct());
    expect(screen.getByText("Vela Aromática")).toBeInTheDocument();
    expect(screen.getByText(/2\.500,00/)).toBeInTheDocument();
  });

  it("muestra 'Desde' cuando hay variantes con precios distintos", () => {
    renderCard(
      buildProduct({
        variants: [
          {
            sku: "VELA-1",
            attributeName: "Tamaño",
            attributeValue: "Chico",
            price: 200000,
            costPrice: 90000,
            stock: 5,
            lowStockThreshold: 1,
          },
          {
            sku: "VELA-2",
            attributeName: "Tamaño",
            attributeValue: "Grande",
            price: 350000,
            costPrice: 150000,
            stock: 5,
            lowStockThreshold: 1,
          },
        ],
      }),
    );
    expect(screen.getByText("Desde")).toBeInTheDocument();
  });

  it("indica sin stock cuando todas las variantes están agotadas", () => {
    renderCard(
      buildProduct({
        variants: [
          {
            sku: "VELA-1",
            attributeName: "Color",
            attributeValue: "Verde",
            price: 250000,
            costPrice: 100000,
            stock: 0,
            lowStockThreshold: 1,
          },
        ],
      }),
    );
    expect(screen.getByText("Sin stock")).toBeInTheDocument();
  });
});
