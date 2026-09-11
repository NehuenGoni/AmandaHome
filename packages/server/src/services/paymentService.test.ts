import { Types } from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockPreferenceCreate = vi.fn();
const mockPaymentGet = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn().mockImplementation(() => ({})),
  Preference: vi.fn().mockImplementation(() => ({ create: mockPreferenceCreate })),
  Payment: vi.fn().mockImplementation(() => ({ get: mockPaymentGet })),
}));

const { createPaymentPreference, fetchPayment } = await import("./paymentService.js");
const { Order } = await import("../models/Order.js");

afterEach(() => {
  vi.clearAllMocks();
});

function buildOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return new Order({
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
      street: "Calle Falsa",
      city: "CABA",
      province: "Buenos Aires",
      postalCode: "C1000",
      country: "Argentina",
    },
    ...overrides,
  });
}

describe("createPaymentPreference", () => {
  it("crea la preferencia con los ítems, el envío y las back_urls", async () => {
    mockPreferenceCreate.mockResolvedValue({ id: "pref-123", init_point: "https://mp.test/checkout" });

    const order = buildOrder();
    const result = await createPaymentPreference(order);

    expect(result).toEqual({ preferenceId: "pref-123", initPoint: "https://mp.test/checkout" });
    const body = mockPreferenceCreate.mock.calls[0][0].body;
    expect(body.items).toHaveLength(2); // producto + envío
    expect(body.items[0].unit_price).toBe(2500); // centavos -> pesos
    expect(body.external_reference).toBe(order._id.toString());
  });

  it("no agrega el ítem de envío cuando el costo es 0", async () => {
    mockPreferenceCreate.mockResolvedValue({ id: "pref-123", init_point: "https://mp.test/checkout" });

    const order = buildOrder({ shippingCost: 0 });
    await createPaymentPreference(order);

    const body = mockPreferenceCreate.mock.calls[0][0].body;
    expect(body.items).toHaveLength(1);
  });
});

describe("fetchPayment", () => {
  it("mapea approved correctamente", async () => {
    mockPaymentGet.mockResolvedValue({
      id: "pay-1",
      status: "approved",
      status_detail: "accredited",
      external_reference: "order-1",
    });

    const result = await fetchPayment("pay-1");
    expect(result.status).toBe("approved");
    expect(result.externalReference).toBe("order-1");
  });

  it("mapea in_process/pending a pending", async () => {
    mockPaymentGet.mockResolvedValue({ id: "pay-2", status: "in_process" });
    expect((await fetchPayment("pay-2")).status).toBe("pending");
  });

  it("mapea rejected a rejected", async () => {
    mockPaymentGet.mockResolvedValue({ id: "pay-3", status: "rejected" });
    expect((await fetchPayment("pay-3")).status).toBe("rejected");
  });

  it("mapea refunded/charged_back a refunded", async () => {
    mockPaymentGet.mockResolvedValue({ id: "pay-4", status: "charged_back" });
    expect((await fetchPayment("pay-4")).status).toBe("refunded");
  });
});
