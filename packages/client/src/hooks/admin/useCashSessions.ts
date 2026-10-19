import { listCashSessions } from "@/lib/cashSessionsApi";
import { useAsyncResource } from "./useAsyncResource";

export function useCashSessions(page: number) {
  return useAsyncResource(
    () => listCashSessions(page),
    String(page),
    "No pudimos cargar el historial de cajas",
  );
}
