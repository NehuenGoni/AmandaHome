import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { sendOrderConfirmationEmail } from "./email/emailService.js";
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

    if (order.paymentStatus === payment.status && order.paymentDetails?.paymentId === payment.id) return; // ya procesado

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
    } else if (payment.status === "approved" && order.status === "cancelled" && !order.paymentIssue) {
      // El pedido ya se canceló (venció o lo canceló un admin) pero el pago
      // llegó aprobado igual: no se reactiva solo, un admin decide.
      order.paymentIssue = {
        reason: "approved_on_cancelled",
        paymentId: payment.id,
        flaggedAt: new Date(),
      };
      order.statusHistory.push({
        status: order.status,
        changedAt: new Date(),
        note: "Pago aprobado por Mercado Pago sobre un pedido ya cancelado: requiere revisión",
      });
    }
    // Un pago rechazado o cancelado por Mercado Pago ya no cancela la orden
    // automáticamente: el pedido sigue pending para poder reintentar el pago
    // (ver payMyOrder). La tarea de vencimiento o un admin lo cancelan si
    // corresponde.

    await order.save();
  } catch (err) {
    console.error("[webhook] error procesando notificación de pago:", err);
  }
}
