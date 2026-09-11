import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { sendOrderConfirmationEmail } from "./email/emailService.js";
import { returnStock } from "./inventoryService.js";
import { fetchPayment } from "./paymentService.js";

/**
 * Nunca lanza: el controller siempre responde 200 a Mercado Pago para no
 * disparar reintentos agresivos ante un problema transitorio nuestro.
 * Idempotente: reprocesar la misma notificación no duplica efectos.
 */
export async function handlePaymentWebhook(paymentId: string | undefined): Promise<void> {
  if (!paymentId) return;

  try {
    const payment = await fetchPayment(paymentId);
    if (!payment.externalReference) return;

    const order = await Order.findById(payment.externalReference);
    if (!order) return;

    if (order.paymentStatus === payment.status) return; // ya procesado

    order.paymentStatus = payment.status;
    order.paymentDetails = {
      ...order.paymentDetails,
      paymentId: payment.id,
      mpStatus: payment.rawStatus,
      mpStatusDetail: payment.statusDetail,
    };

    if (payment.status === "approved" && order.status === "pending") {
      order.status = "confirmed";
      order.statusHistory.push({
        status: "confirmed",
        changedAt: new Date(),
        note: "Pago aprobado por Mercado Pago",
      });

      const customer = await User.findById(order.customer);
      if (customer) {
        sendOrderConfirmationEmail(customer, { orderNumber: order.orderNumber, total: order.total });
      }
    } else if ((payment.status === "rejected" || payment.status === "cancelled") && order.status === "pending") {
      const items = order.items.map((item) => ({
        product: item.product.toString(),
        variantSku: item.variantSku,
        quantity: item.quantity,
      }));
      await returnStock(items, {
        reference: order._id.toString(),
        note: "Pago rechazado o cancelado por Mercado Pago",
      });

      order.status = "cancelled";
      order.statusHistory.push({
        status: "cancelled",
        changedAt: new Date(),
        note: "Pago rechazado o cancelado por Mercado Pago, stock repuesto",
      });
    }

    await order.save();
  } catch (err) {
    console.error("[webhook] error procesando notificación de pago:", err);
  }
}
