import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as orderService from "../services/orderService.js";
import type { MongoIdParam } from "../validators/commonValidators.js";
import type {
  AdminListOrdersQuery,
  AttachReceiptInput,
  ListOrdersQuery,
  UpdateOrderStatusInput,
} from "../validators/orderValidators.js";

export const listMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListOrdersQuery;
  const result = await orderService.listMyOrders(req.user!.id, query);
  res.json(result);
});

export const getMyOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const order = await orderService.getMyOrderById(req.user!.id, id);
  res.json({ order });
});

export const attachReceipt = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const input = req.body as AttachReceiptInput;
  const order = await orderService.attachReceipt(req.user!.id, id, input);
  res.json({ order });
});

export const adminListOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as AdminListOrdersQuery;
  const result = await orderService.listAdminOrders(query);
  res.json(result);
});

export const adminGetOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const order = await orderService.getAdminOrderById(id);
  res.json({ order });
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const input = req.body as UpdateOrderStatusInput;
  const order = await orderService.updateOrderStatus(id, input, req.user!.id);
  res.json({ order });
});
