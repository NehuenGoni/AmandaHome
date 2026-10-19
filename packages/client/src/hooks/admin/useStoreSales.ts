import { listStoreSales, type ListStoreSalesParams } from "@/lib/storeSalesApi";
import { useAsyncResource } from "./useAsyncResource";

export function useStoreSales(params: ListStoreSalesParams) {
  return useAsyncResource(
    () => listStoreSales(params),
    JSON.stringify(params),
    "No pudimos cargar las ventas",
  );
}
