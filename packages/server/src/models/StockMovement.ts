import mongoose, { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import type { StockMovementType } from "@amanda/shared";

const STOCK_MOVEMENT_TYPES: StockMovementType[] = ["purchase_in", "sale_out", "adjustment", "return"];

export interface IStockMovement {
  product: Types.ObjectId;
  variantSku: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string;
  note?: string;
  createdBy?: Types.ObjectId;
}

export type StockMovementDocument = HydratedDocument<IStockMovement>;

const stockMovementSchema = new Schema<IStockMovement>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantSku: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: STOCK_MOVEMENT_TYPES, required: true },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true, min: 0 },
    newStock: { type: Number, required: true, min: 0 },
    reference: { type: String },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockMovementSchema.index({ product: 1, variantSku: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

/** Log de auditoría inmutable: nunca se edita ni se borra, solo se generan nuevos movimientos. */
function blockMutation(next: (err?: Error) => void) {
  next(new Error("StockMovement es inmutable: no se puede editar ni eliminar"));
}
stockMovementSchema.pre(["updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete"], blockMutation);

export const StockMovement =
  (mongoose.models.StockMovement as Model<IStockMovement>) ??
  model<IStockMovement>("StockMovement", stockMovementSchema);
