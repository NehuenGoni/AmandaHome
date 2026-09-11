import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as checkoutService from "../services/checkoutService.js";
import * as webhookService from "../services/webhookService.js";
import type { CreateCheckoutInput } from "../validators/checkoutValidators.js";

export const createCheckout = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateCheckoutInput;
  const { order, checkoutUrl } = await checkoutService.createOrderFromCart(req.user!.id, input);
  res.status(201).json({ order, checkoutUrl });
});

/** Mercado Pago manda la notificación tanto por query como por body según el flujo. */
function extractPaymentId(req: Request): string | undefined {
  const body = req.body as { type?: string; data?: { id?: string | number } } | undefined;
  const type = body?.type ?? (req.query.type as string | undefined) ?? (req.query.topic as string | undefined);
  if (type && type !== "payment") return undefined;

  const id = body?.data?.id ?? req.query["data.id"] ?? req.query.id;
  return id === undefined ? undefined : String(id);
}

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const paymentId = extractPaymentId(req);
  await webhookService.handlePaymentWebhook(paymentId);
  res.sendStatus(200);
});
