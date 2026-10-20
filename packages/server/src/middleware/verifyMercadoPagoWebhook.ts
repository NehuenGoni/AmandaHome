import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env, isMercadoPagoWebhookSecretConfigured } from "../config/env.js";
import { getNotificationDataId, getNotificationType } from "../utils/mercadoPagoNotification.js";

function parseSignatureHeader(header: string): { ts?: string; v1?: string } {
  const result: { ts?: string; v1?: string } = {};
  for (const part of header.split(",")) {
    const [key, value] = part.split("=");
    if (key === "ts" || key === "v1") result[key] = value?.trim();
  }
  return result;
}

/**
 * Valida que la notificación realmente venga de Mercado Pago, según el
 * algoritmo que documenta MP para el tópico "payment": HMAC-SHA256 de
 * "id:{data.id};request-id:{x-request-id};ts:{ts};" con la clave secreta
 * del webhook, comparado contra el header x-signature.
 *
 * Solo se exige para notificaciones de tipo "payment": las de
 * "merchant_order" (el canal IPN clásico que realmente llega desde la
 * notification_url de la preferencia) no se firman con este esquema, y de
 * todas formas el handler nunca confía en el payload — siempre re-consulta
 * los datos reales contra la API de Mercado Pago con nuestro access token.
 *
 * Sin clave configurada (dev/test sin webhook), tampoco valida.
 */
export function verifyMercadoPagoWebhook(req: Request, res: Response, next: NextFunction): void {
  const type = getNotificationType(req);
  if (!isMercadoPagoWebhookSecretConfigured || type !== "payment") {
    next();
    return;
  }

  const signatureHeader = req.header("x-signature");
  const requestId = req.header("x-request-id");
  const dataId = getNotificationDataId(req);

  if (!signatureHeader || !requestId || !dataId) {
    res.sendStatus(401);
    return;
  }

  const { ts, v1 } = parseSignatureHeader(signatureHeader);
  if (!ts || !v1) {
    res.sendStatus(401);
    return;
  }

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", env.MERCADOPAGO_WEBHOOK_SECRET!)
    .update(manifest)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(v1, "hex");
  const isValid =
    expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

  if (!isValid) {
    console.error("[webhook] firma inválida en una notificación de pago de Mercado Pago, se rechaza");
    res.sendStatus(401);
    return;
  }

  next();
}
