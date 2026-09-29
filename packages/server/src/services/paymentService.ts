import type { PaymentStatus } from "@amanda/shared";
import { centsToPesos } from "@amanda/shared";
import { MercadoPagoConfig, Payment, PaymentRefund, Preference } from "mercadopago";
import { env, isMercadoPagoConfigured } from "../config/env.js";
import type { OrderDocument } from "../models/Order.js";
import { ServiceUnavailableError } from "../utils/AppError.js";

let client: MercadoPagoConfig | undefined;

function getClient(): MercadoPagoConfig {
  if (!isMercadoPagoConfigured) {
    throw new ServiceUnavailableError("Mercado Pago no está configurado");
  }
  client ??= new MercadoPagoConfig({ accessToken: env.MERCADOPAGO_ACCESS_TOKEN! });
  return client;
}

/** Plazo único de pago por pedido: se usa tanto para la preferencia original como para cualquier reintento. */
export const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getPaymentDeadline(order: OrderDocument): Date {
  const createdAt = (order as { createdAt?: Date }).createdAt ?? new Date();
  return new Date(createdAt.getTime() + PAYMENT_WINDOW_MS);
}

export interface PaymentPreference {
  preferenceId: string;
  initPoint: string;
}

export async function createPaymentPreference(
  order: OrderDocument,
  expiresAt: Date,
): Promise<PaymentPreference> {
  const preference = new Preference(getClient());

  const items = order.items.map((item) => ({
    id: item.variantSku,
    title: `${item.productName} - ${item.attributeValue}`,
    quantity: item.quantity,
    unit_price: centsToPesos(item.unitPrice),
    currency_id: "ARS",
  }));

  if (order.shippingCost > 0) {
    items.push({
      id: "shipping",
      title: "Envío",
      quantity: 1,
      unit_price: centsToPesos(order.shippingCost),
      currency_id: "ARS",
    });
  }

  // Usamos el _id (no el orderNumber) porque es lo que el endpoint de
  // detalle de pedido del cliente acepta.
  const confirmationUrl = `${env.CLIENT_URL}/order-confirmation/${order._id.toString()}`;

  const response = await preference.create({
    body: {
      items,
      external_reference: order._id.toString(),
      back_urls: {
        success: confirmationUrl,
        failure: `${confirmationUrl}?status=failure`,
        pending: `${confirmationUrl}?status=pending`,
      },
      auto_return: "approved",
      notification_url: `${env.SERVER_URL}/api/checkout/webhook`,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: expiresAt.toISOString(),
    },
  });

  if (!response.id || !response.init_point) {
    throw new ServiceUnavailableError("No se pudo crear la preferencia de pago");
  }

  return { preferenceId: response.id, initPoint: response.init_point };
}

function mapMercadoPagoStatus(mpStatus: string | undefined): PaymentStatus {
  switch (mpStatus) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

export interface FetchedPayment {
  id: string;
  status: PaymentStatus;
  rawStatus: string | undefined;
  statusDetail: string | undefined;
  externalReference: string | undefined;
  /** "ticket" para Rapipago/Pago Fácil, "credit_card"/"debit_card" para tarjetas, etc. */
  paymentTypeId: string | undefined;
}

/** Nunca confía en el payload de la notificación: re-consulta el pago real contra la API de MP. */
export async function fetchPayment(paymentId: string): Promise<FetchedPayment> {
  const payment = new Payment(getClient());
  const result = await payment.get({ id: paymentId });

  return {
    id: String(result.id),
    status: mapMercadoPagoStatus(result.status),
    rawStatus: result.status,
    statusDetail: result.status_detail,
    externalReference: result.external_reference,
    paymentTypeId: result.payment_type_id,
  };
}

/** Reembolso total: se usa cuando un pago aprobado quedó asociado a un pedido ya cancelado. */
export async function refundPayment(paymentId: string): Promise<void> {
  const refund = new PaymentRefund(getClient());
  await refund.total({ payment_id: paymentId });
}
