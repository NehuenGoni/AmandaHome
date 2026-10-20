export type WithdrawalStatus = "received" | "processed" | "rejected";

export interface WithdrawalReceipt {
  requestNumber: number;
  createdAt: string;
}
