import { Router } from "express";
import { z } from "zod";
import * as userController from "../controllers/userController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { objectIdSchema } from "../validators/commonValidators.js";
import { addressSchema, updateAddressSchema, updateProfileSchema } from "../validators/userValidators.js";

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.patch("/me", validateRequest(updateProfileSchema), userController.updateProfile);

userRouter.post("/me/addresses", validateRequest(addressSchema), userController.addAddress);
userRouter.patch(
  "/me/addresses/:addressId",
  validateRequest(z.object({ addressId: objectIdSchema }), "params"),
  validateRequest(updateAddressSchema),
  userController.updateAddress,
);
userRouter.delete(
  "/me/addresses/:addressId",
  validateRequest(z.object({ addressId: objectIdSchema }), "params"),
  userController.removeAddress,
);
