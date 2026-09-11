import type { Order, PaginatedResult } from "@amanda/shared";
import { useEffect, useState } from "react";
import { listMyOrders } from "@/lib/ordersApi";

export function useMyOrders(page: number) {
  const [data, setData] = useState<PaginatedResult<Order> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    listMyOrders(page)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  return { data, isLoading };
}
