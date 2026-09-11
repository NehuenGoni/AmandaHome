import type { PaginatedResult, Product } from "@amanda/shared";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { listProducts, type ListProductsParams } from "@/lib/productsApi";

export function useProducts(params: ListProductsParams) {
  const [data, setData] = useState<PaginatedResult<Product> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listProducts(params)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No pudimos cargar los productos");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, isLoading, error };
}
