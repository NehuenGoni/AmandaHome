import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";

/**
 * Mismo patrón que los hooks useAdminXxx: carga al montar o cuando cambia
 * `key`, descarta respuestas viejas y expone `reload` para refrescar tras mutar.
 */
export function useAsyncResource<T>(fetcher: () => Promise<T>, key: string, errorMessage: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : errorMessage);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadToken]);

  return { data, setData, isLoading, error, reload };
}
