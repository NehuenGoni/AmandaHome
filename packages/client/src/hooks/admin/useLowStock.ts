import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { listLowStock, type LowStockVariant } from "@/lib/inventoryApi";

export function useLowStock() {
  const [items, setItems] = useState<LowStockVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listLowStock()
      .then((result) => {
        if (!cancelled) setItems(result.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No pudimos cargar el stock bajo");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { items, isLoading, error, reload };
}
