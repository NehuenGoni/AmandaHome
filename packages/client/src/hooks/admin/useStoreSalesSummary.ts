import { getStoreSalesSummary } from "@/lib/storeSalesApi";
import { useAsyncResource } from "./useAsyncResource";

/** Resumen de hoy: el servidor usa por defecto el día calendario de Argentina. */
export function useStoreSalesSummary() {
  const { data, isLoading, error, reload } = useAsyncResource(
    () => getStoreSalesSummary(),
    "today",
    "No pudimos cargar las ventas del local",
  );
  return { summary: data?.summary ?? null, isLoading, error, reload };
}
