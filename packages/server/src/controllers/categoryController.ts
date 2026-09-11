import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as categoryService from "../services/categoryService.js";
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  ReorderCategoriesInput,
  UpdateCategoryInput,
} from "../validators/categoryValidators.js";
import type { MongoIdParam } from "../validators/commonValidators.js";

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await categoryService.listPublicCategories();
  res.json({ categories });
});

export const getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.getPublicCategoryBySlug(req.params.slug as string);
  res.json({ category });
});

export const adminListCategories = asyncHandler(async (req: Request, res: Response) => {
  const { includeInactive } = req.query as unknown as ListCategoriesQuery;
  const categories = await categoryService.listAllCategories(Boolean(includeInactive));
  res.json({ categories });
});

export const adminGetCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const category = await categoryService.getCategoryById(id);
  res.json({ category });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateCategoryInput;
  const category = await categoryService.createCategory(input);
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  const input = req.body as UpdateCategoryInput;
  const category = await categoryService.updateCategory(id, input);
  res.json({ category });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as MongoIdParam;
  await categoryService.deleteCategory(id);
  res.status(204).send();
});

export const reorderCategories = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as ReorderCategoriesInput;
  await categoryService.reorderCategories(input);
  res.status(204).send();
});
