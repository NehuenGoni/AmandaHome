import { Router } from "express";
import * as cartController from "../controllers/cartController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  addCartItemSchema,
  cartItemParamsSchema,
  mergeCartSchema,
  updateCartItemSchema,
} from "../validators/cartValidators.js";

export const cartRouter = Router();

cartRouter.use(authenticate);

cartRouter.get("/", cartController.getCart);
cartRouter.post("/items", validateRequest(addCartItemSchema), cartController.addItem);
cartRouter.patch(
  "/items/:productId/:variantSku",
  validateRequest(cartItemParamsSchema, "params"),
  validateRequest(updateCartItemSchema),
  cartController.updateItem,
);
cartRouter.delete(
  "/items/:productId/:variantSku",
  validateRequest(cartItemParamsSchema, "params"),
  cartController.removeItem,
);
cartRouter.delete("/", cartController.clearCart);
cartRouter.post("/merge", validateRequest(mergeCartSchema), cartController.mergeCart);
