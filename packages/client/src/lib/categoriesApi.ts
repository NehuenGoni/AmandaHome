import type { Category } from "@amanda/shared";
import { apiGet } from "./apiClient.js";

export const listCategories = () => apiGet<{ categories: Category[] }>("/categories");

export const getCategoryBySlug = (slug: string) => apiGet<{ category: Category }>(`/categories/${slug}`);
