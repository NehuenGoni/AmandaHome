import type { OrderStatus, PaginatedResult } from "@amanda/shared";
import { Types, type FilterQuery } from "mongoose";
import { Order, type IOrder, type OrderDocument } from "../models/Order.js";
import { User } from "../models/User.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/AppError.js";
import { sendOrderStatusChangeEmail } from "./email/emailService.js";
import { returnStock } from "./inventoryService.js";
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
