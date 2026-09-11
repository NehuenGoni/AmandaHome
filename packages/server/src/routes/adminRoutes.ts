import { Router } from "express";
import * as adminController from "../controllers/adminController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { inviteAdminSchema } from "../validators/adminValidators.js";
import { mongoIdParamSchema } from "../validators/commonValidators.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole("admin"));

adminRouter.post("/invites", validateRequest(inviteAdminSchema), adminController.inviteAdmin);
adminRouter.get("/invites", adminController.listPendingInvites);
adminRouter.post(
  "/invites/:id/revoke",
  validateRequest(mongoIdParamSchema, "params"),
  adminController.revokeInvite,
);

adminRouter.get("/admins", adminController.listAdmins);
adminRouter.post(
  "/admins/:id/revoke",
  validateRequest(mongoIdParamSchema, "params"),
  adminController.revokeAdmin,
);
