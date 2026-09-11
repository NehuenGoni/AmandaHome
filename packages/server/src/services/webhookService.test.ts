import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mockPaymentGet = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn().mockImplementation(() => ({})),
  Preference: vi.fn().mockImplementation(() => ({ create: vi.fn() })),
  Payment: vi.fn().mockImplementation(() => ({ get: mockPaymentGet })),
}));

const { handlePaymentWebhook } = await import("./webhookService.js");
const { Category } = await import("../models/Category.js");
const { Order } = await import("../models/Order.js");
const { Product } = await import("../models/Product.js");
const { clearTestDB, closeTestDB, connectTestDB } = await import("../test/dbTestUtils.js");

beforeAll(connectTestDB);
afterEach(() => {
  vi.clearAllMocks();
  return clearTestDB();
});
afterAll(closeTestDB);

async function createOrderWithProduct(stockAfterCheckout = 3) {
  const category = await Category.create({ name: `Cat-${Math.random()}` });
  const product = await Product.create({
    name: "Vela",
    category,
    variants: [
      {
        sku: "VELA-1",
        attributeName: "Color",
        attributeValue: "Verde",
        price: 250000,
        costPrice: 100000,
        stock: stockAfterCheckout,
        lowStockThreshold: 1,
      },
    ],
  });

  const order = await Order.create({
    orderNumber: 1,
    customer: new Types.ObjectId(),
    items: [
      {
        product: product._id,
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
    shippingCost: 0,
    total: 500000,
    status: "pending",
    statusHistory: [{ status: "pending", changedAt: new Date() }],
    paymentMethod: "mercado_pago",
    paymentStatus: "pending",
    shippingMethod: "pickup",
    shippingAddress: {
      street: "Calle Falsa",
      city: "CABA",
      province: "Buenos Aires",
      postalCode: "C1000",
      country: "Argentina",
    },
  });

  return { order, product };
}

describe("handlePaymentWebhook", () => {
  it("promueve la orden a confirmed cuando el pago está aprobado", async () => {
    const { order } = await createOrderWithProduct();
    mockPaymentGet.mockResolvedValue({
      id: "pay-1",
      status: "approved",
      external_reference: order._id.toString(),
    });

    await handlePaymentWebhook("pay-1");

    const updated = await Order.findById(order._id);
    expect(updated?.status).toBe("confirmed");
    expect(updated?.paymentStatus).toBe("approved");
    expect(updated?.statusHistory).toHaveLength(2);
  });

  it("cancela la orden y repone el stock cuando el pago es rechazado", async () => {
    const { order, product } = await createOrderWithProduct(3);
    mockPaymentGet.mockResolvedValue({
      id: "pay-2",
      status: "rejected",
      external_reference: order._id.toString(),
    });

    await handlePaymentWebhook("pay-2");

    const updated = await Order.findById(order._id);
    expect(updated?.status).toBe("cancelled");

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]?.stock).toBe(5); // 3 + 2 repuestas
  });

  it("es idempotente: no reprocesa si el paymentStatus ya coincide", async () => {
    const { order } = await createOrderWithProduct();
    mockPaymentGet.mockResolvedValue({
      id: "pay-3",
      status: "approved",
      external_reference: order._id.toString(),
    });

    await handlePaymentWebhook("pay-3");
    await handlePaymentWebhook("pay-3");

    const updated = await Order.findById(order._id);
    expect(updated?.statusHistory).toHaveLength(2); // no se duplicó la entrada
  });

  it("ignora notificaciones sin paymentId", async () => {
    await expect(handlePaymentWebhook(undefined)).resolves.toBeUndefined();
    expect(mockPaymentGet).not.toHaveBeenCalled();
  });

  it("ignora si la orden referenciada no existe", async () => {
    mockPaymentGet.mockResolvedValue({
      id: "pay-4",
      status: "approved",
      external_reference: new Types.ObjectId().toString(),
    });
    await expect(handlePaymentWebhook("pay-4")).resolves.toBeUndefined();
  });

  it("nunca lanza aunque la consulta a Mercado Pago falle", async () => {
    mockPaymentGet.mockRejectedValue(new Error("timeout"));
    await expect(handlePaymentWebhook("pay-5")).resolves.toBeUndefined();
  });
});
