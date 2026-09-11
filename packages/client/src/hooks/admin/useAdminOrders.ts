import type { Order, PaginatedResult } from "@amanda/shared";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { listAdminOrders, type AdminListOrdersParams } from "@/lib/adminOrdersApi";

export function useAdminOrders(params: AdminListOrdersParams) {
  const [data, setData] = useState<PaginatedResult<Order> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const key = JSON.stringify(params);
  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listAdminOrders(params)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No pudimos cargar los pedidos");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadToken]);

  return { data, isLoading, error, reload };
}
