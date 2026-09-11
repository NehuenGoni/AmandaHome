import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { Order } from "./Order.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

function buildOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    orderNumber: 1,
    customer: new Types.ObjectId(),
    items: [
      {
        product: new Types.ObjectId(),
        productName: "Vela",
        variantSku: "VELA-1",
        attributeName: "Color",
        attributeValue: "Verde",
        unitPrice: 250000,
        quantity: 2,
        subtotal: 500000,
      },
    ],
    subtotal: 500000,
    shippingCost: 150000,
    total: 650000,
    paymentMethod: "mercado_pago",
    shippingMethod: "standard",
    shippingAddress: {
      street: "Av. Siempre Viva",
      number: "742",
      city: "CABA",
      province: "Buenos Aires",
      postalCode: "C1000",
      country: "Argentina",
    },
    ...overrides,
  };
}

describe("Order", () => {
  it("aplica status pending y paymentStatus pending por defecto", async () => {
    const order = await Order.create(buildOrder());
    expect(order.status).toBe("pending");
    expect(order.paymentStatus).toBe("pending");
  });

  it("rechaza una orden sin ítems", async () => {
    await expect(Order.create(buildOrder({ items: [] }))).rejects.toThrow();
  });

  it("rechaza orderNumber duplicado", async () => {
    await Order.create(buildOrder());
    await expect(Order.create(buildOrder())).rejects.toThrow();
  });

  it("guarda el historial de estados", async () => {
    const order = await Order.create(
      buildOrder({ statusHistory: [{ status: "pending", changedAt: new Date() }] }),
    );
    expect(order.statusHistory).toHaveLength(1);
  });
});
