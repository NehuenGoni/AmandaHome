import type { Order } from "@amanda/shared";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { getAdminOrder } from "@/lib/adminOrdersApi";

export function useAdminOrder(id: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getAdminOrder(id)
      .then((result) => {
        if (!cancelled) setOrder(result.order);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No pudimos cargar el pedido");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  return { order, isLoading, error, reload, setOrder };
}
