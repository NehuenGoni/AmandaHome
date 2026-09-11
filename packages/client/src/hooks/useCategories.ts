import type { Category } from "@amanda/shared";
import { useEffect, useState } from "react";
import { listCategories } from "@/lib/categoriesApi";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((result) => {
        if (!cancelled) setCategories(result.categories);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, isLoading };
}
