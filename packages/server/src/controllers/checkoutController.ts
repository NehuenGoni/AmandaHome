import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as checkoutService from "../services/checkoutService.js";
import * as webhookService from "../services/webhookService.js";
import { getNotificationDataId, getNotificationType } from "../utils/mercadoPagoNotification.js";
import type { CreateCheckoutInput } from "../validators/checkoutValidators.js";

export const createCheckout = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateCheckoutInput;
  const { order, checkoutUrl } = await checkoutService.createOrderFromCart(req.user!.id, input);
  res.status(201).json({ order, checkoutUrl });
});

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const type = getNotificationType(req);
  const dataId = getNotificationDataId(req);

  // La notification_url de la preferencia manda "merchant_order" (canal IPN
  // clásico); el tópico "payment" puede llegar por otra vía (Webhooks v2).
  // Si no hay tipo, se asume payment por compatibilidad con integraciones
  // previas que no lo mandaban.
  if (type === "merchant_order") {
    await webhookService.handleMerchantOrderWebhook(dataId);
  } else if (!type || type === "payment") {
    await webhookService.handlePaymentWebhook(dataId);
  }

  res.sendStatus(200);
});
