import { Router } from "express";
import * as checkoutController from "../controllers/checkoutController.js";

export const checkoutWebhookRouter = Router();

checkoutWebhookRouter.post("/", checkoutController.handleWebhook);
