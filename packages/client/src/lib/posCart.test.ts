import type { StoreProductLookup } from "@amanda/shared";
import { describe, expect, it } from "vitest";
import { EMPTY_POS_CART, computePosTotals, discountAmount, posCartReducer } from "./posCart";

const vela: StoreProductLookup = {
  productId: "p1",
  productName: "Vela",
  variantSku: "VELA-1",
  attributeName: "Aroma",
  attributeValue: "Vainilla",
  price: 100000,
  stock: 3,
};

describe("posCartReducer", () => {
  it("agrega una línea y suma una unidad al volver a escanear el mismo SKU", () => {
    let state = posCartReducer(EMPTY_POS_CART, { type: "add", product: vela });
    state = posCartReducer(state, { type: "add", product: vela });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0]!.quantity).toBe(2);
  });

  it("no pasa del stock disponible ni agrega productos sin stock", () => {
    let state = EMPTY_POS_CART;
    for (let i = 0; i < 5; i++) state = posCartReducer(state, { type: "add", product: vela });
    expect(state.lines[0]!.quantity).toBe(3);

    state = posCartReducer(state, { type: "setQuantity", variantSku: "VELA-1", quantity: 10 });
    expect(state.lines[0]!.quantity).toBe(3);

    const empty = posCartReducer(EMPTY_POS_CART, { type: "add", product: { ...vela, stock: 0 } });
    expect(empty.lines).toHaveLength(0);
  });

  it("quita líneas y vacía el carrito", () => {
    let state = posCartReducer(EMPTY_POS_CART, { type: "add", product: vela });
    state = posCartReducer(state, { type: "remove", variantSku: "VELA-1" });
    expect(state.lines).toHaveLength(0);
    state = posCartReducer(state, { type: "add", product: vela });
    expect(posCartReducer(state, { type: "clear" })).toEqual(EMPTY_POS_CART);
  });
});

describe("computePosTotals", () => {
  it("aplica descuento de línea y luego descuento global, igual que el servidor", () => {
    let state = posCartReducer(EMPTY_POS_CART, { type: "add", product: vela });
    state = posCartReducer(state, { type: "setQuantity", variantSku: "VELA-1", quantity: 2 });
    state = posCartReducer(state, {
      type: "setLineDiscount",
      variantSku: "VELA-1",
      discount: { type: "percent", value: 10 },
    });
    state = posCartReducer(state, { type: "setDiscount", discount: { type: "amount", value: 10000 } });

    const totals = computePosTotals(state);
    expect(totals.lines["VELA-1"]).toEqual({ gross: 200000, discount: 20000, subtotal: 180000 });
    expect(totals.subtotal).toBe(180000);
    expect(totals.discount).toBe(10000);
    expect(totals.total).toBe(170000);
    expect(totals.units).toBe(2);
  });

  it("acota los descuentos al importe sobre el que se aplican", () => {
    expect(discountAmount(5000, { type: "amount", value: 9000 })).toBe(5000);
    expect(discountAmount(5000, { type: "percent", value: 150 })).toBe(5000);
    expect(discountAmount(5000, { type: "percent", value: 0 })).toBe(0);
    expect(discountAmount(5000)).toBe(0);
  });
});
