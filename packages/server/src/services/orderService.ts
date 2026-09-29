import type { OrderStatus, PaginatedResult } from "@amanda/shared";
import { Types, type FilterQuery } from "mongoose";
import { decrementStock } from "./checkoutService.js";
import { Order, type IOrder, type OrderDocument } from "../models/Order.js";
import { User } from "../models/User.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/AppError.js";
import { sendOrderConfirmationEmail, sendOrderStatusChangeEmail } from "./email/emailService.js";
import { recordMovements, returnStock } from "./inventoryService.js";
import { createPaymentPreference, getPaymentDeadline, refundPayment } from "./paymentService.js";
import type {
  AdminListOrdersQuery,
  AttachReceiptInput,
  ListOrdersQuery,
  UpdateOrderStatusInput,
} from "../validators/orderValidators.js";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/** Un pago en efectivo (Rapipago/Pago Fácil) queda "en proceso" varios días: se le da más margen antes de vencer el pedido. */
const CASH_PAYMENT_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
/** Un poco más que PAYMENT_WINDOW_MS (24h): le da margen a la preferencia para vencer del lado de Mercado Pago antes de cancelar nosotros. */
const PENDING_ORDER_GRACE_MS = 25 * 60 * 60 * 1000;

async function paginateOrders(
  filter: FilterQuery<IOrder>,
  query: ListOrdersQuery,
): Promise<PaginatedResult<OrderDocument>> {
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Order.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function listMyOrders(
  userId: string,
  query: ListOrdersQuery,
): Promise<PaginatedResult<OrderDocument>> {
  return paginateOrders({ customer: userId }, query);
}

export async function getMyOrderById(userId: string, orderId: string): Promise<OrderDocument> {
  const order = await Order.findOne({ _id: orderId, customer: userId });
  if (!order) throw new NotFoundError("Pedido no encontrado");
  return order;
}

export async function attachReceipt(
  userId: string,
  orderId: string,
  input: AttachReceiptInput,
): Promise<OrderDocument> {
  const order = await getMyOrderById(userId, orderId);
  order.receiptUrl = input.receiptUrl;
  await order.save();
  return order;
}

export async function listAdminOrders(
  query: AdminListOrdersQuery,
): Promise<PaginatedResult<OrderDocument>> {
  const filter: FilterQuery<IOrder> = {};
  if (query.status) filter.status = query.status;
  if (query.customer) filter.customer = query.customer;
  if (query.needsReview) {
    filter["paymentIssue.flaggedAt"] = { $exists: true };
    filter["paymentIssue.resolvedAt"] = { $exists: false };
  }
  return paginateOrders(filter, query);
}

export async function getAdminOrderById(orderId: string): Promise<OrderDocument> {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError("Pedido no encontrado");
  return order;
}

export async function updateOrderStatus(
  orderId: string,
  input: UpdateOrderStatusInput,
  adminId: string,
): Promise<OrderDocument> {
  const order = await getAdminOrderById(orderId);

  if (order.status === input.status) {
    throw new BadRequestError("El pedido ya está en ese estado");
  }

  const allowedNext = VALID_TRANSITIONS[order.status];
  if (!allowedNext.includes(input.status)) {
    throw new ForbiddenError(`No se puede pasar de "${order.status}" a "${input.status}"`);
  }

  if (input.status === "cancelled") {
    const items = order.items.map((item) => ({
      product: item.product.toString(),
      variantSku: item.variantSku,
      quantity: item.quantity,
    }));
    await returnStock(items, {
      reference: order._id.toString(),
      note: input.note ?? "Pedido cancelado por un administrador",
      createdBy: adminId,
    });
  }

  order.status = input.status;
  if (input.trackingNumber) order.trackingNumber = input.trackingNumber;
  order.statusHistory.push({
    status: input.status,
    changedAt: new Date(),
    changedBy: new Types.ObjectId(adminId),
    note: input.note,
  });
  await order.save();

  const customer = await User.findById(order.customer);
  if (customer) {
    sendOrderStatusChangeEmail(customer, { orderNumber: order.orderNumber }, input.status);
  }

  return order;
}

/**
 * Reintento de pago (1b): si el link guardado sigue vigente lo reutiliza
 * (una preferencia de Mercado Pago acepta varios intentos), y si no,
 * crea una preferencia nueva respetando el mismo plazo de vencimiento.
 */
export async function payMyOrder(userId: string, orderId: string): Promise<{ checkoutUrl: string }> {
  const order = await getMyOrderById(userId, orderId);

  if (order.status !== "pending") {
    throw new BadRequestError("El pedido ya no está pendiente de pago");
  }

  const deadline = getPaymentDeadline(order);
  if (deadline.getTime() <= Date.now()) {
    throw new BadRequestError("El pedido venció, ya no se puede pagar");
  }

  const details = order.paymentDetails as { initPoint?: string; expiresAt?: Date } | undefined;
  if (details?.initPoint && details.expiresAt && new Date(details.expiresAt).getTime() > Date.now()) {
    return { checkoutUrl: details.initPoint };
  }

  const { preferenceId, initPoint } = await createPaymentPreference(order, deadline);
  order.paymentDetails = { ...order.paymentDetails, preferenceId, initPoint, expiresAt: deadline };
  await order.save();

  return { checkoutUrl: initPoint };
}

/**
 * Vence pedidos pending abandonados (1c): corre al arrancar el server y
 * después cada 15 minutos. Los pagos en efectivo (Rapipago/Pago Fácil)
 * quedan "en proceso" varios días, así que se les da más margen.
 */
export async function expireStalePendingOrders(now: Date = new Date()): Promise<number> {
  const isCashPaymentInProcess: FilterQuery<IOrder> = {
    paymentStatus: "pending",
    "paymentDetails.paymentId": { $exists: true },
  };

  const candidates = await Order.find({
    status: "pending",
    createdAt: { $lt: new Date(now.getTime() - PENDING_ORDER_GRACE_MS) },
    $nor: [
      {
        ...isCashPaymentInProcess,
        createdAt: { $gte: new Date(now.getTime() - CASH_PAYMENT_GRACE_MS) },
      },
    ],
  });

  let expiredCount = 0;
  for (const candidate of candidates) {
    // Actualización condicional: si otro proceso (el webhook) ya cambió el
    // estado, no se pisa esa confirmación ni se devuelve el stock dos veces.
    const updated = await Order.findOneAndUpdate(
      { _id: candidate._id, status: "pending" },
      {
        $set: { status: "cancelled" },
        $push: {
          statusHistory: {
            status: "cancelled",
            changedAt: now,
            note: "Vencido: no se recibió el pago a tiempo",
          },
        },
      },
    );
    if (!updated) continue;

    const items = updated.items.map((item) => ({
      product: item.product.toString(),
      variantSku: item.variantSku,
      quantity: item.quantity,
    }));
    await returnStock(items, {
      reference: updated._id.toString(),
      note: "Pedido vencido, stock repuesto",
    });
    expiredCount++;
  }

  return expiredCount;
}

/**
 * Resuelve un `paymentIssue` reactivando el pedido: solo tiene sentido si
 * todavía hay stock disponible para los ítems.
 */
export async function reactivateOrder(orderId: string, adminId: string): Promise<OrderDocument> {
  const order = await getAdminOrderById(orderId);

  if (!order.paymentIssue || order.paymentIssue.resolvedAt) {
    throw new BadRequestError("Este pedido no tiene un pago pendiente de revisión");
  }

  const stockDecrements = order.items.map((item) => ({
    product: item.product,
    variantSku: item.variantSku,
    quantity: item.quantity,
  }));
  const stockChanges = await decrementStock(stockDecrements);
  await recordMovements(stockChanges, {
    type: "sale_out",
    reference: order._id.toString(),
    createdBy: adminId,
  });

  order.status = "confirmed";
  order.paymentIssue.resolvedAt = new Date();
  order.paymentIssue.resolution = "reactivated";
  order.statusHistory.push({
    status: "confirmed",
    changedAt: new Date(),
    changedBy: new Types.ObjectId(adminId),
    note: "Pedido reactivado por un administrador tras un pago aprobado sobre un pedido cancelado",
  });
  await order.save();

  const customer = await User.findById(order.customer);
  if (customer) {
    sendOrderConfirmationEmail(customer, { orderNumber: order.orderNumber, total: order.total });
  }

  return order;
}

/**
 * Resuelve un `paymentIssue` devolviendo la plata en Mercado Pago cuando
 * no queda stock (o el admin decide no reactivar el pedido).
 */
export async function refundOrderPayment(orderId: string, adminId: string): Promise<OrderDocument> {
  const order = await getAdminOrderById(orderId);

  if (!order.paymentIssue || order.paymentIssue.resolvedAt) {
    throw new BadRequestError("Este pedido no tiene un pago pendiente de revisión");
  }

  await refundPayment(order.paymentIssue.paymentId);

  order.paymentStatus = "refunded";
  order.paymentIssue.resolvedAt = new Date();
  order.paymentIssue.resolution = "refunded";
  order.statusHistory.push({
    status: order.status,
    changedAt: new Date(),
    changedBy: new Types.ObjectId(adminId),
    note: "Pago reembolsado por un administrador",
  });
  await order.save();

  return order;
}
