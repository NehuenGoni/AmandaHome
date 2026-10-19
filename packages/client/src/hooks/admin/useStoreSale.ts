import type { StoreSale } from "@amanda/shared";
import { getStoreSale } from "@/lib/storeSalesApi";
import { useAsyncResource } from "./useAsyncResource";

export function useStoreSale(id: string | undefined) {
  const { data, setData, isLoading, error, reload } = useAsyncResource(
    () => getStoreSale(id!),
    id ?? "",
    "No pudimos cargar la venta",
  );
  return {
    sale: data?.sale ?? null,
    setSale: (sale: StoreSale) => setData({ sale }),
    isLoading,
    error,
    reload,
  };
}
