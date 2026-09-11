import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("./email/emailService.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./email/emailService.js")>();
  return { ...actual, sendOrderStatusChangeEmail: vi.fn() };
});

const { Category } = await import("../models/Category.js");
const { Product } = await import("../models/Product.js");
const { Order } = await import("../models/Order.js");
const { User } = await import("../models/User.js");
const { clearTestDB, closeTestDB, connectTestDB } = await import("../test/dbTestUtils.js");
const orderService = await import("./orderService.js");
const { sendOrderStatusChangeEmail } = await import("./email/emailService.js");

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
        variantSku: `SKU-${unique}`,
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
