import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env, isMercadoPagoWebhookSecretConfigured } from "../config/env.js";

/** El "data.id" puede venir en el body o en la query según el flujo de notificación. */
function extractDataId(req: Request): string | undefined {
  const body = req.body as { data?: { id?: string | number } } | undefined;
  const id = body?.data?.id ?? req.query["data.id"] ?? req.query.id;
  return id === undefined ? undefined : String(id);
}

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
 * algoritmo que documenta MP: HMAC-SHA256 de
 * "id:{data.id};request-id:{x-request-id};ts:{ts};" con la clave secreta
 * del webhook, comparado contra el header x-signature.
 *
 * Sin clave configurada (dev/test sin webhook), no valida y deja pasar: el
 * handler igual nunca confía en el payload, siempre re-consulta el pago
 * real contra la API de Mercado Pago.
 */
export function verifyMercadoPagoWebhook(req: Request, res: Response, next: NextFunction): void {
  if (!isMercadoPagoWebhookSecretConfigured) {
    next();
    return;
  }

  const signatureHeader = req.header("x-signature");
  const requestId = req.header("x-request-id");
  const dataId = extractDataId(req);

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
    console.error("[webhook] firma inválida en una notificación de Mercado Pago, se rechaza");
    res.sendStatus(401);
    return;
  }

  next();
}
