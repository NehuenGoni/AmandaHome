import type { PaymentStatus } from "@amanda/shared";
import { centsToPesos } from "@amanda/shared";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
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

export interface PaymentPreference {
  preferenceId: string;
  initPoint: string;
}

export async function createPaymentPreference(order: OrderDocument): Promise<PaymentPreference> {
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

  const confirmationUrl = `${env.CLIENT_URL}/order-confirmation/${order.orderNumber}`;

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
  };
}
