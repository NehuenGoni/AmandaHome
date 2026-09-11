import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as cartService from "../services/cartService.js";
import type {
  AddCartItemInput,
  CartItemParams,
  MergeCartInput,
  UpdateCartItemInput,
} from "../validators/cartValidators.js";

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.user!.id);
  res.json(cart);
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as AddCartItemInput;
  const cart = await cartService.addItem(req.user!.id, input);
  res.status(201).json(cart);
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId, variantSku } = req.params as unknown as CartItemParams;
  const { quantity } = req.body as UpdateCartItemInput;
  const cart = await cartService.updateItemQuantity(req.user!.id, productId, variantSku, quantity);
  res.json(cart);
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId, variantSku } = req.params as unknown as CartItemParams;
  const cart = await cartService.removeItem(req.user!.id, productId, variantSku);
  res.json(cart);
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  await cartService.clearCart(req.user!.id);
  res.status(204).send();
});

export const mergeCart = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as MergeCartInput;
  const cart = await cartService.mergeAnonymousCart(req.user!.id, input);
  res.json(cart);
});
