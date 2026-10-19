import type { CashMovementType, CashSession, PaginatedResult } from "@amanda/shared";
import { apiGet, apiPost } from "./apiClient.js";

export interface CashMovementInput {
  type: CashMovementType;
  amount: number;
  reason: string;
}

export interface CloseCashSessionInput {
  countedCash: number;
  notes?: string;
}

export const getCurrentCashSession = () =>
  apiGet<{ session: CashSession | null }>("/admin/cash-sessions/current");

export const openCashSession = (openingAmount: number) =>
  apiPost<{ session: CashSession }>("/admin/cash-sessions", { openingAmount });

export const addCashMovement = (input: CashMovementInput) =>
  apiPost<{ session: CashSession }>("/admin/cash-sessions/current/movements", input);

export const closeCashSession = (input: CloseCashSessionInput) =>
  apiPost<{ session: CashSession }>("/admin/cash-sessions/current/close", input);

export const listCashSessions = (page = 1, limit = 10) =>
  apiGet<PaginatedResult<CashSession>>(`/admin/cash-sessions?page=${page}&limit=${limit}`);
