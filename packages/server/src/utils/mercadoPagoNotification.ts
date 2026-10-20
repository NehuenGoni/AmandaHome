import type { Request } from "express";

type NotificationBody = { type?: string; data?: { id?: string | number } } | undefined;

/** Mercado Pago manda el tipo de notificación tanto por query como por body según el flujo. */
export function getNotificationType(req: Request): string | undefined {
  const body = req.body as NotificationBody;
  return body?.type ?? (req.query.type as string | undefined) ?? (req.query.topic as string | undefined);
}

/** El "data.id" (payment id o merchant_order id según el tipo) puede venir en el body o en la query. */
export function getNotificationDataId(req: Request): string | undefined {
  const body = req.body as NotificationBody;
  const id = body?.data?.id ?? req.query["data.id"] ?? req.query.id;
  return id === undefined ? undefined : String(id);
}
