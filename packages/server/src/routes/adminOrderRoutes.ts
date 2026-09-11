import { Router } from "express";
import * as orderController from "../controllers/orderController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { mongoIdParamSchema } from "../validators/commonValidators.js";
import { adminListOrdersQuerySchema, updateOrderStatusSchema } from "../validators/orderValidators.js";

export const adminOrderRouter = Router();

adminOrderRouter.use(authenticate, requireRole("admin"));

adminOrderRouter.get(
  "/",
  validateRequest(adminListOrdersQuerySchema, "query"),
  orderController.adminListOrders,
);
adminOrderRouter.get("/:id", validateRequest(mongoIdParamSchema, "params"), orderController.adminGetOrder);
adminOrderRouter.patch(
  "/:id/status",
  validateRequest(mongoIdParamSchema, "params"),
  validateRequest(updateOrderStatusSchema),
  orderController.updateOrderStatus,
);
