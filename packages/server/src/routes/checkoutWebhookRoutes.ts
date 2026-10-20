import { Router } from "express";
import * as checkoutController from "../controllers/checkoutController.js";
import { verifyMercadoPagoWebhook } from "../middleware/verifyMercadoPagoWebhook.js";

export const checkoutWebhookRouter = Router();

checkoutWebhookRouter.post("/", verifyMercadoPagoWebhook, checkoutController.handleWebhook);
