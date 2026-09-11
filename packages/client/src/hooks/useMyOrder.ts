import type { Order } from "@amanda/shared";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { getMyOrder } from "@/lib/ordersApi";

export function useMyOrder(id: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getMyOrder(id)
      .then((result) => {
        if (!cancelled) setOrder(result.order);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError && err.status === 404 ? "Pedido no encontrado" : "No pudimos cargar el pedido");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { order, isLoading, error };
}
