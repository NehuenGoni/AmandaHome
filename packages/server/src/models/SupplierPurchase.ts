import mongoose, { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface ISupplierPurchaseItem {
  product: Types.ObjectId;
  variantSku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface ISupplierPurchase {
  supplierName: string;
  items: ISupplierPurchaseItem[];
  totalCost: number;
  purchaseDate: Date;
  notes?: string;
  createdBy: Types.ObjectId;
}

export type SupplierPurchaseDocument = HydratedDocument<ISupplierPurchase>;

const supplierPurchaseItemSchema = new Schema<ISupplierPurchaseItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantSku: { type: String, required: true, uppercase: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const supplierPurchaseSchema = new Schema<ISupplierPurchase>(
  {
    supplierName: { type: String, required: true, trim: true },
    items: {
      type: [supplierPurchaseItemSchema],
      required: true,
      validate: {
        validator: (v: ISupplierPurchaseItem[]) => v.length > 0,
        message: "La compra debe tener al menos un ítem",
      },
    },
    totalCost: { type: Number, required: true, min: 0 },
    purchaseDate: { type: Date, required: true, default: () => new Date() },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

supplierPurchaseSchema.index({ purchaseDate: -1 });

export const SupplierPurchase =
  (mongoose.models.SupplierPurchase as Model<ISupplierPurchase>) ??
  model<ISupplierPurchase>("SupplierPurchase", supplierPurchaseSchema);
