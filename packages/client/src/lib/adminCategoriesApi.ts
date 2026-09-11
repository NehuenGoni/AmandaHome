import type { Category } from "@amanda/shared";
import { apiDelete, apiGet, apiPatch, apiPost } from "./apiClient.js";

export interface CategoryInput {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  parent?: string | null;
  order?: number;
  isActive?: boolean;
}

export const listAdminCategories = (includeInactive = true) =>
  apiGet<{ categories: Category[] }>(`/admin/categories?includeInactive=${includeInactive}`);

export const getAdminCategory = (id: string) => apiGet<{ category: Category }>(`/admin/categories/${id}`);

export const createCategory = (input: CategoryInput) =>
  apiPost<{ category: Category }>("/admin/categories", input);

export const updateCategory = (id: string, input: Partial<CategoryInput>) =>
  apiPatch<{ category: Category }>(`/admin/categories/${id}`, input);

export const deleteCategory = (id: string) => apiDelete<void>(`/admin/categories/${id}`);

export const reorderCategories = (items: { id: string; order: number }[]) =>
  apiPost<void>("/admin/categories/reorder", { items });
