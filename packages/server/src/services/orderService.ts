import type { OrderStatus, PaginatedResult, ShippingTrackingEvent } from "@amanda/shared";
import { centsToPesos, isCarrierShippingMethod } from "@amanda/shared";
import { Types, type FilterQuery } from "mongoose";
import { runInTransaction } from "../config/db.js";
import { decrementStock } from "./checkoutService.js";
import { Order, type IOrder, type OrderDocument } from "../models/Order.js";
import { User } from "../models/User.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/AppError.js";
import { sendOrderConfirmationEmail, sendOrderStatusChangeEmail } from "./email/emailService.js";
import { recordMovements, returnStock } from "./inventoryService.js";
import { createPaymentPreference, getPaymentDeadline, refundPayment } from "./paymentService.js";
import { shippingCarrier } from "./shipping/index.js";
import { estimatePackage } from "./shippingService.js";
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

  await runInTransaction(async (session) => {
    if (input.status === "cancelled") {
      const items = order.items.map((item) => ({
        product: item.product.toString(),
        variantSku: item.variantSku,
        quantity: item.quantity,
      }));
      await returnStock(
        items,
        {
          reference: order._id.toString(),
          note: input.note ?? "Pedido cancelado por un administrador",
          createdBy: adminId,
        },
        session,
      );
    }

    order.status = input.status;
    if (input.trackingNumber) order.trackingNumber = input.trackingNumber;
    order.statusHistory.push({
      status: input.status,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(adminId),
      note: input.note,
    });
    await order.save({ session });
  });

  const customer = await User.findById(order.customer);
  if (customer) {
    sendOrderStatusChangeEmail(customer, { orderNumber: order.orderNumber }, input.status);
  }

  return order;
}

function setCarrierImportFields(
  order: OrderDocument,
  fields: Pick<NonNullable<IOrder["shippingDetails"]>, "carrierImportedAt" | "carrierImportError">,
): void {
  // Pedidos viejos pueden no tener `shippingDetails` (se creaban solo al cotizar).
  order.shippingDetails ??= { carrier: "correo_argentino", quotedAt: new Date() };
  order.shippingDetails.carrierImportedAt = fields.carrierImportedAt;
  order.shippingDetails.carrierImportError = fields.carrierImportError;
}

/**
 * Carga el envío en Correo Argentino (MiCorreo) para que el admin pueda
 * imprimir la etiqueta desde su web. Se dispara solo al aprobarse el pago
 * (`auto: true`, que no falla si no corresponde cargarlo) y el admin puede
 * reintentarlo a mano si falló. Si el correo lo rechaza, el motivo queda en
 * `shippingDetails.carrierImportError`. No genera número de seguimiento: eso
 * se sigue cargando a mano al pasar el pedido a "Enviado".
 */
export async function importOrderToCarrier(
  orderId: string,
  { auto = false }: { auto?: boolean } = {},
): Promise<OrderDocument> {
  const order = await getAdminOrderById(orderId);

  const skipReason = !isCarrierShippingMethod(order.shippingMethod)
    ? "Este pedido no se despacha por correo"
    : order.paymentStatus !== "approved"
      ? "El pedido todavía no tiene el pago aprobado"
      : order.shippingDetails?.carrierImportedAt
        ? "Este envío ya fue cargado en el correo"
        : undefined;
  if (skipReason) {
    if (auto) return order;
    throw new BadRequestError(skipReason);
  }

  const customer = await User.findById(order.customer);
  if (!customer) throw new NotFoundError("Cliente del pedido no encontrado");

  const details = order.shippingDetails;
  const shippingPackage =
    details?.packageWeight && details.packageHeight && details.packageWidth && details.packageLength
      ? {
          weight: details.packageWeight,
          height: details.packageHeight,
          width: details.packageWidth,
          length: details.packageLength,
        }
      : // Pedidos viejos, creados antes de guardar el paquete usado: se recalcula con el paquete por defecto actual.
        await estimatePackage(order.items.map((item) => ({ quantity: item.quantity })));

  try {
    await shippingCarrier.importShipment({
      order,
      recipientName: `${customer.firstName} ${customer.lastName}`.trim(),
      recipientEmail: customer.email,
      recipientPhone: order.shippingAddress?.phone ?? customer.phone,
      declaredValue: centsToPesos(order.subtotal),
      package: shippingPackage,
    });
  } catch (err) {
    setCarrierImportFields(order, {
      carrierImportError: err instanceof Error ? err.message : "Error desconocido al cargar el envío",
    });
    await order.save();
    throw err;
  }

  setCarrierImportFields(order, { carrierImportedAt: new Date(), carrierImportError: undefined });
  await order.save();

  return order;
}

async function trackOrder(order: OrderDocument): Promise<ShippingTrackingEvent[]> {
  if (!order.trackingNumber || !isCarrierShippingMethod(order.shippingMethod)) return [];
  return shippingCarrier.track(order.trackingNumber);
}

export async function getMyOrderTracking(userId: string, orderId: string): Promise<ShippingTrackingEvent[]> {
  return trackOrder(await getMyOrderById(userId, orderId));
}

export async function getAdminOrderTracking(orderId: string): Promise<ShippingTrackingEvent[]> {
  return trackOrder(await getAdminOrderById(orderId));
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
    // El cambio de estado y la reposición van en la misma transacción.
    const expired = await runInTransaction(async (session) => {
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
        { session },
      );
      if (!updated) return false;

      const items = updated.items.map((item) => ({
        product: item.product.toString(),
        variantSku: item.variantSku,
        quantity: item.quantity,
      }));
      await returnStock(
        items,
        { reference: updated._id.toString(), note: "Pedido vencido, stock repuesto" },
        session,
      );
      return true;
    });
    if (expired) expiredCount++;
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
  const paymentIssue = order.paymentIssue;
  await runInTransaction(async (session) => {
    const stockChanges = await decrementStock(stockDecrements, session);
    await recordMovements(
      stockChanges,
      { type: "sale_out", reference: order._id.toString(), createdBy: adminId },
      session,
    );

    order.status = "confirmed";
    paymentIssue.resolvedAt = new Date();
    paymentIssue.resolution = "reactivated";
    order.statusHistory.push({
      status: "confirmed",
      changedAt: new Date(),
      changedBy: new Types.ObjectId(adminId),
      note: "Pedido reactivado por un administrador tras un pago aprobado sobre un pedido cancelado",
    });
    await order.save({ session });
  });

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
