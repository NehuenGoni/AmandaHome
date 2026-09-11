import type { Product } from "@amanda/shared";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { getProductBySlug } from "@/lib/productsApi";

export function useProduct(slug: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setProduct(null);

    getProductBySlug(slug)
      .then((result) => {
        if (!cancelled) setProduct(result.product);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError && err.status === 404 ? "Producto no encontrado" : "No pudimos cargar el producto");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { product, isLoading, error };
}
