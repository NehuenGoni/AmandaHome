import type { PaginatedResult, SupplierPurchase } from "@amanda/shared";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { listSupplierPurchases } from "@/lib/supplierPurchasesApi";

export function useSupplierPurchases(page: number) {
  const [data, setData] = useState<PaginatedResult<SupplierPurchase> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listSupplierPurchases(page)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No pudimos cargar las compras");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  return { data, isLoading, error, reload };
}
