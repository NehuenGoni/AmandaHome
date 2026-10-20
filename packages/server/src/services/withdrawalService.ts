import { BUSINESS, type WithdrawalReceipt } from "@amanda/shared";
import { Order } from "../models/Order.js";
import { getNextSequence } from "../models/Counter.js";
import { User } from "../models/User.js";
import { WithdrawalRequest } from "../models/WithdrawalRequest.js";
import type { CreateWithdrawalInput } from "../validators/withdrawalValidators.js";
import { sendWithdrawalConfirmationEmail, sendWithdrawalNotificationEmail } from "./email/emailService.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Registra el arrepentimiento y devuelve siempre una constancia, exista o no
 * el pedido: así el endpoint público no permite averiguar qué pedidos o
 * emails existen. Si el pedido no coincide, igual se guarda (y se avisa al
 * local) para que ningún reclamo quede sin atender.
 */
export async function createWithdrawalRequest(
  input: CreateWithdrawalInput,
  ip?: string,
): Promise<WithdrawalReceipt> {
  const email = input.email.trim().toLowerCase();
  const order = await Order.findOne({ orderNumber: input.orderNumber });
  const customer = order ? await User.findById(order.customer).select("email") : null;
  const matched = order && customer?.email.toLowerCase() === email ? order : null;

  // El plazo corre desde la entrega, o desde la compra si todavía no se entregó.
  let needsReview = !matched;
  if (matched) {
    const delivered = [...matched.statusHistory].reverse().find((h) => h.status === "delivered");
    const since = (delivered?.changedAt ?? (matched.get("createdAt") as Date)).getTime();
    needsReview = Date.now() - since > BUSINESS.withdrawalDays * DAY_MS;
  }

  const requestNumber = await getNextSequence("withdrawalRequestNumber");
  const request = await WithdrawalRequest.create({
    requestNumber,
    orderNumber: input.orderNumber,
    order: matched?._id,
    email,
    fullName: input.fullName,
    reason: input.reason || undefined,
    needsReview,
    ip,
  });

  sendWithdrawalConfirmationEmail(email, request);
  sendWithdrawalNotificationEmail(request, Boolean(matched));

  return { requestNumber, createdAt: request.createdAt.toISOString() };
}
