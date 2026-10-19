import type { CashSession } from "@amanda/shared";
import { getCurrentCashSession } from "@/lib/cashSessionsApi";
import { useAsyncResource } from "./useAsyncResource";

export function useCurrentCashSession() {
  const { data, setData, isLoading, error, reload } = useAsyncResource(
    getCurrentCashSession,
    "current",
    "No pudimos cargar la caja",
  );
  return {
    session: data?.session ?? null,
    setSession: (session: CashSession | null) => setData({ session }),
    isLoading,
    error,
    reload,
  };
}
