import type { WithdrawalReceipt } from "@amanda/shared";
import { apiFetch } from "./apiClient.js";

export interface WithdrawalInput {
  orderNumber: number;
  email: string;
  fullName: string;
  reason?: string;
}

export const createWithdrawal = (input: WithdrawalInput) =>
  apiFetch<WithdrawalReceipt>("/withdrawals", { method: "POST", body: input, skipAuthRetry: true });
