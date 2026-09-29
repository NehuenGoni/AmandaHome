import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mockPreferenceCreate = vi.fn();
const mockRefundTotal = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn().mockImplementation(() => ({})),
  Preference: vi.fn().mockImplementation(() => ({ create: mockPreferenceCreate })),
  Payment: vi.fn().mockImplementation(() => ({ get: vi.fn() })),
  PaymentRefund: vi.fn().mockImplementation(() => ({ total: mockRefundTotal })),
}));

vi.mock("./email/emailService.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./email/emailService.js")>();
  return { ...actual, sendOrderStatusChangeEmail: vi.fn(), sendOrderConfirmationEmail: vi.fn() };
});

const { Category } = await import("../models/Category.js");
const { Product } = await import("../models/Product.js");
const { Order } = await import("../models/Order.js");
const { User } = await import("../models/User.js");
const { clearTestDB, closeTestDB, connectTestDB } = await import("../test/dbTestUtils.js");
const orderService = await import("./orderService.js");
const { sendOrderStatusChangeEmail, sendOrderConfirmationEmail } = await import("./email/emailService.js");

beforeAll(connectTestDB);
afterEach(() => {
  vi.clearAllMocks();
  return clearTestDB();
});
afterAll(closeTestDB);

async function createOrderFor(customerId: Types.ObjectId, overrides: Partial<Record<string, unknown>> = {}) {
  const unique = Math.random().toString(36).slice(2);
  const category = await Category.create({ name: `Cat-${unique}` });
  const product = await Product.create({
    name: `Producto ${unique}`,
    category,
    variants: [
      {
        sku: `SKU-${unique}`,
        attributeName: "Color",
        attributeValue: "Verde",
        price: 250000,
        costPrice: 100000,
        stock: 3,
        lowStockThreshold: 1,
      },
    ],
  });

  return Order.create({
    orderNumber: Math.floor(Math.random() * 1_000_000),
    customer: customerId,
    items: [
      {
        product: product._id,
        productName: product.name,
        // El schema de Product fuerza el sku a mayúsculas: hay que usar el
        // valor real guardado, no el string original en minúsculas.
        variantSku: product.variants[0]!.sku,
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
    paymentStatus: "approved",
    shippingMethod: "pickup",
    shippingAddress: {
      street: "Calle Falsa",
      city: "CABA",
      province: "Buenos Aires",
      postalCode: "C1000",
      country: "Argentina",
    },
    ...overrides,
  }).then((order) => ({ order, product }));
}

describe("listMyOrders / getMyOrderById", () => {
  it("solo devuelve pedidos del usuario", async () => {
    const userA = new Types.ObjectId();
    const userB = new Types.ObjectId();
    await createOrderFor(userA);
    await createOrderFor(userB);

    const result = await orderService.listMyOrders(userA.toString(), { page: 1, limit: 20 });
    expect(result.total).toBe(1);
  });

  it("lanza NotFoundError si el pedido no pertenece al usuario", async () => {
    const userA = new Types.ObjectId();
    const userB = new Types.ObjectId();
    const { order } = await createOrderFor(userA);

    await expect(orderService.getMyOrderById(userB.toString(), order._id.toString())).rejects.toThrow();
  });
});

describe("attachReceipt", () => {
  it("adjunta la URL del comprobante al pedido propio", async () => {
    const userId = new Types.ObjectId();
    const { order } = await createOrderFor(userId);

    const updated = await orderService.attachReceipt(userId.toString(), order._id.toString(), {
      receiptUrl: "https://res.cloudinary.com/test/receipt.jpg",
    });
    expect(updated.receiptUrl).toBe("https://res.cloudinary.com/test/receipt.jpg");
  });

  it("rechaza adjuntar comprobante a un pedido ajeno", async () => {
    const userA = new Types.ObjectId();
    const userB = new Types.ObjectId();
    const { order } = await createOrderFor(userA);

    await expect(
      orderService.attachReceipt(userB.toString(), order._id.toString(), {
        receiptUrl: "https://res.cloudinary.com/test/receipt.jpg",
      }),
    ).rejects.toThrow();
  });
});

describe("listAdminOrders", () => {
  it("filtra por status", async () => {
    const userId = new Types.ObjectId();
    await createOrderFor(userId, { status: "pending" });
    await createOrderFor(userId, { status: "delivered" });

    const result = await orderService.listAdminOrders({ page: 1, limit: 20, status: "delivered" });
    expect(result.total).toBe(1);
  });
});

describe("updateOrderStatus", () => {
  it("permite una transición válida y registra el historial", async () => {
    const userId = await User.create({
      email: `cliente-${Date.now()}@example.com`,
      password: "supersecreto123",
      firstName: "Cliente",
      lastName: "Test",
    });
    const { order } = await createOrderFor(userId._id, { status: "pending" });
    const admin = new Types.ObjectId();

    const updated = await orderService.updateOrderStatus(
      order._id.toString(),
      { status: "confirmed" },
      admin.toString(),
    );

    expect(updated.status).toBe("confirmed");
    expect(updated.statusHistory).toHaveLength(2);
    expect(sendOrderStatusChangeEmail).toHaveBeenCalledTimes(1);
  });

  it("rechaza una transición inválida (saltar pasos)", async () => {
    const { order } = await createOrderFor(new Types.ObjectId(), { status: "pending" });
    await expect(
      orderService.updateOrderStatus(order._id.toString(), { status: "shipped" }, new Types.ObjectId().toString()),
    ).rejects.toThrow();
  });

  it("rechaza transicionar a un estado terminal ya alcanzado", async () => {
    const { order } = await createOrderFor(new Types.ObjectId(), { status: "delivered" });
    await expect(
      orderService.updateOrderStatus(order._id.toString(), { status: "cancelled" }, new Types.ObjectId().toString()),
    ).rejects.toThrow();
  });

  it("rechaza volver a fijar el mismo estado", async () => {
    const { order } = await createOrderFor(new Types.ObjectId(), { status: "pending" });
    await expect(
      orderService.updateOrderStatus(order._id.toString(), { status: "pending" }, new Types.ObjectId().toString()),
    ).rejects.toThrow();
  });

  it("repone el stock al cancelar un pedido", async () => {
    const { order, product } = await createOrderFor(new Types.ObjectId(), { status: "confirmed" });

    await orderService.updateOrderStatus(
      order._id.toString(),
      { status: "cancelled" },
      new Types.ObjectId().toString(),
    );

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]?.stock).toBe(5); // 3 + 2 repuestas
  });

  it("guarda el trackingNumber cuando se provee", async () => {
    const { order } = await createOrderFor(new Types.ObjectId(), { status: "preparing" });
    const updated = await orderService.updateOrderStatus(
      order._id.toString(),
      { status: "shipped", trackingNumber: "TRACK-123" },
      new Types.ObjectId().toString(),
    );
    expect(updated.trackingNumber).toBe("TRACK-123");
  });
});

// Mongoose marca "createdAt" como immutable cuando timestamps:true, así que un
// updateOne normal lo ignora: hay que pisarlo con el driver nativo.
async function setCreatedAt(orderId: Types.ObjectId, createdAt: Date) {
  await Order.collection.updateOne({ _id: orderId }, { $set: { createdAt } });
}

describe("payMyOrder", () => {
  it("devuelve el link guardado si la preferencia sigue vigente", async () => {
    const userId = new Types.ObjectId();
    const { order } = await createOrderFor(userId, {
      status: "pending",
      paymentStatus: "pending",
      paymentDetails: {
        preferenceId: "pref-1",
        initPoint: "https://mp.test/existing",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const result = await orderService.payMyOrder(userId.toString(), order._id.toString());

    expect(result.checkoutUrl).toBe("https://mp.test/existing");
    expect(mockPreferenceCreate).not.toHaveBeenCalled();
  });

  it("crea una preferencia nueva si no hay link guardado o el guardado venció", async () => {
    mockPreferenceCreate.mockResolvedValue({ id: "pref-2", init_point: "https://mp.test/new" });
    const userId = new Types.ObjectId();
    const { order } = await createOrderFor(userId, {
      status: "pending",
      paymentStatus: "pending",
      paymentDetails: {
        preferenceId: "pref-1",
        initPoint: "https://mp.test/expired",
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });

    const result = await orderService.payMyOrder(userId.toString(), order._id.toString());

    expect(result.checkoutUrl).toBe("https://mp.test/new");
    expect(mockPreferenceCreate).toHaveBeenCalledTimes(1);

    const updated = await Order.findById(order._id);
    expect((updated?.paymentDetails as { initPoint?: string })?.initPoint).toBe("https://mp.test/new");
  });

  it("rechaza el pedido de otro usuario", async () => {
    const userId = new Types.ObjectId();
    const { order } = await createOrderFor(userId, { status: "pending", paymentStatus: "pending" });

    await expect(
      orderService.payMyOrder(new Types.ObjectId().toString(), order._id.toString()),
    ).rejects.toThrow();
  });

  it("rechaza un pedido que ya no está pendiente", async () => {
    const userId = new Types.ObjectId();
    const { order } = await createOrderFor(userId, { status: "confirmed" });

    await expect(orderService.payMyOrder(userId.toString(), order._id.toString())).rejects.toThrow();
  });

  it("rechaza un pedido vencido", async () => {
    const userId = new Types.ObjectId();
    const { order } = await createOrderFor(userId, { status: "pending", paymentStatus: "pending" });
    await setCreatedAt(order._id, new Date(Date.now() - 26 * 60 * 60 * 1000));

    await expect(orderService.payMyOrder(userId.toString(), order._id.toString())).rejects.toThrow();
  });
});

describe("expireStalePendingOrders", () => {
  it("vence pedidos pending viejos y repone el stock", async () => {
    const { order, product } = await createOrderFor(new Types.ObjectId(), {
      status: "pending",
      paymentStatus: "pending",
    });
    await setCreatedAt(order._id, new Date(Date.now() - 26 * 60 * 60 * 1000));

    const expired = await orderService.expireStalePendingOrders();

    expect(expired).toBe(1);
    const updated = await Order.findById(order._id);
    expect(updated?.status).toBe("cancelled");
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]?.stock).toBe(5); // 3 + 2 repuestas
  });

  it("no toca pedidos pending recientes", async () => {
    const { order } = await createOrderFor(new Types.ObjectId(), {
      status: "pending",
      paymentStatus: "pending",
    });

    const expired = await orderService.expireStalePendingOrders();

    expect(expired).toBe(0);
    const updated = await Order.findById(order._id);
    expect(updated?.status).toBe("pending");
  });

  it("le da más margen a un pago en efectivo en proceso (Rapipago/Pago Fácil)", async () => {
    const { order } = await createOrderFor(new Types.ObjectId(), {
      status: "pending",
      paymentStatus: "pending",
      paymentDetails: { paymentId: "pay-cash-1", mpStatus: "pending" },
    });
    await setCreatedAt(order._id, new Date(Date.now() - 26 * 60 * 60 * 1000)); // vencería un pedido normal

    const expired = await orderService.expireStalePendingOrders();

    expect(expired).toBe(0);
    const updated = await Order.findById(order._id);
    expect(updated?.status).toBe("pending");
  });

  it("no repone el stock dos veces si se corre dos veces", async () => {
    const { order, product } = await createOrderFor(new Types.ObjectId(), {
      status: "pending",
      paymentStatus: "pending",
    });
    await setCreatedAt(order._id, new Date(Date.now() - 26 * 60 * 60 * 1000));

    await orderService.expireStalePendingOrders();
    const secondRun = await orderService.expireStalePendingOrders();

    expect(secondRun).toBe(0);
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]?.stock).toBe(5); // no se repuso dos veces
  });
});

describe("reactivateOrder", () => {
  it("reactiva un pedido cancelado con paymentIssue si hay stock disponible", async () => {
    const customer = await User.create({
      email: `cliente-${Date.now()}-${Math.random()}@example.com`,
      password: "supersecreto123",
      firstName: "Cliente",
      lastName: "Test",
    });
    const { order } = await createOrderFor(customer._id, {
      status: "cancelled",
      paymentIssue: { reason: "approved_on_cancelled", paymentId: "pay-late-1", flaggedAt: new Date() },
    });

    const updated = await orderService.reactivateOrder(order._id.toString(), new Types.ObjectId().toString());

    expect(updated.status).toBe("confirmed");
    expect(updated.paymentIssue?.resolution).toBe("reactivated");
    expect(updated.paymentIssue?.resolvedAt).toBeDefined();
    expect(sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  it("falla si ya no hay stock suficiente", async () => {
    const { order, product } = await createOrderFor(new Types.ObjectId(), {
      status: "cancelled",
      paymentIssue: { reason: "approved_on_cancelled", paymentId: "pay-late-2", flaggedAt: new Date() },
    });
    await Product.updateOne({ _id: product._id }, { $set: { "variants.0.stock": 0 } });

    await expect(
      orderService.reactivateOrder(order._id.toString(), new Types.ObjectId().toString()),
    ).rejects.toThrow();

    const untouched = await Order.findById(order._id);
    expect(untouched?.status).toBe("cancelled");
    expect(untouched?.paymentIssue?.resolvedAt).toBeUndefined();
  });

  it("rechaza si el pedido no tiene un paymentIssue pendiente de revisión", async () => {
    const { order } = await createOrderFor(new Types.ObjectId(), { status: "cancelled" });

    await expect(
      orderService.reactivateOrder(order._id.toString(), new Types.ObjectId().toString()),
    ).rejects.toThrow();
  });
});

describe("refundOrderPayment", () => {
  it("reembolsa el pago en Mercado Pago y marca la resolución", async () => {
    mockRefundTotal.mockResolvedValue({ id: 1, status: "approved" });
    const { order } = await createOrderFor(new Types.ObjectId(), {
      status: "cancelled",
      paymentIssue: { reason: "approved_on_cancelled", paymentId: "pay-late-3", flaggedAt: new Date() },
    });

    const updated = await orderService.refundOrderPayment(order._id.toString(), new Types.ObjectId().toString());

    expect(mockRefundTotal).toHaveBeenCalledWith({ payment_id: "pay-late-3" });
    expect(updated.paymentStatus).toBe("refunded");
    expect(updated.paymentIssue?.resolution).toBe("refunded");
    expect(updated.paymentIssue?.resolvedAt).toBeDefined();
  });

  it("rechaza si el pedido no tiene un paymentIssue pendiente de revisión", async () => {
    const { order } = await createOrderFor(new Types.ObjectId(), { status: "cancelled" });

    await expect(
      orderService.refundOrderPayment(order._id.toString(), new Types.ObjectId().toString()),
    ).rejects.toThrow();
  });
});
