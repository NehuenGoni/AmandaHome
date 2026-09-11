import { Router } from "express";
import * as orderController from "../controllers/orderController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { mongoIdParamSchema } from "../validators/commonValidators.js";
import { attachReceiptSchema, listOrdersQuerySchema } from "../validators/orderValidators.js";

export const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.get("/", validateRequest(listOrdersQuerySchema, "query"), orderController.listMyOrders);
orderRouter.get("/:id", validateRequest(mongoIdParamSchema, "params"), orderController.getMyOrder);
orderRouter.patch(
  "/:id/receipt",
  validateRequest(mongoIdParamSchema, "params"),
  validateRequest(attachReceiptSchema),
  orderController.attachReceipt,
);
