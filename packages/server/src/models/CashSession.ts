import type { CashMovementType, CashSessionStatus, CashSessionTotals } from "@amanda/shared";
import mongoose, { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface ICashMovement {
  _id: Types.ObjectId;
  type: CashMovementType;
  amount: number;
  reason: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface ICashSession {
  status: CashSessionStatus;
  openedBy: Types.ObjectId;
  openedAt: Date;
  openingAmount: number;
  movements: ICashMovement[];
  closedBy?: Types.ObjectId;
  closedAt?: Date;
  countedCash?: number;
  difference?: number;
  notes?: string;
  /** Snapshot definitivo, solo se completa al cerrar. */
  closingTotals?: CashSessionTotals;
}

export type CashSessionDocument = HydratedDocument<ICashSession>;

const cashMovementSchema = new Schema<ICashMovement>({
  type: { type: String, enum: ["in", "out"], required: true },
  amount: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: () => new Date() },
});

const cashSessionSchema = new Schema<ICashSession>(
  {
    status: { type: String, enum: ["open", "closed"], default: "open", required: true },
    openedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    openedAt: { type: Date, default: () => new Date(), required: true },
    openingAmount: { type: Number, required: true, min: 0 },
    movements: { type: [cashMovementSchema], default: [] },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    closedAt: { type: Date },
    countedCash: { type: Number, min: 0 },
    difference: { type: Number },
    notes: { type: String, trim: true },
    closingTotals: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

/**
 * Una sola caja abierta a la vez para todo el local: el índice único parcial
 * hace que, ante dos aperturas simultáneas, la segunda falle con duplicate key.
 */
cashSessionSchema.index(
  { status: 1 },
  { unique: true, partialFilterExpression: { status: "open" } },
);
cashSessionSchema.index({ openedAt: -1 });

export const CashSession =
  (mongoose.models.CashSession as Model<ICashSession>) ??
  model<ICashSession>("CashSession", cashSessionSchema);
