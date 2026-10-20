import type { WithdrawalStatus } from "@amanda/shared";
import mongoose, { Schema, model, type Model, type Types } from "mongoose";

export interface IWithdrawalRequest {
  requestNumber: number;
  orderNumber: number;
  /** Vacío si el número de pedido y el email no coincidieron con ningún pedido. */
  order?: Types.ObjectId;
  email: string;
  fullName: string;
  reason?: string;
  status: WithdrawalStatus;
  /** Pedido encontrado pero fuera del plazo legal: requiere revisión manual. */
  needsReview: boolean;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    requestNumber: { type: Number, required: true, unique: true },
    orderNumber: { type: Number, required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    email: { type: String, required: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    reason: { type: String, trim: true },
    status: { type: String, enum: ["received", "processed", "rejected"], default: "received" },
    needsReview: { type: Boolean, default: false },
    ip: String,
  },
  { timestamps: true },
);

export const WithdrawalRequest =
  (mongoose.models.WithdrawalRequest as Model<IWithdrawalRequest>) ??
  model<IWithdrawalRequest>("WithdrawalRequest", withdrawalRequestSchema);
