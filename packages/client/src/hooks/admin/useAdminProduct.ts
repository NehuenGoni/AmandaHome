import type { Product } from "@amanda/shared";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { getAdminProduct } from "@/lib/adminProductsApi";

export function useAdminProduct(id: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getAdminProduct(id)
      .then((result) => {
        if (!cancelled) setProduct(result.product);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No pudimos cargar el producto");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { product, isLoading, error };
}
