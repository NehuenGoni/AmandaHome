import type {
  StoreDiscountType,
  StorePaymentMethod,
  StoreSaleFiscalReceipt,
  StoreSaleStatus,
} from "@amanda/shared";
import mongoose, { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface IStoreSaleItem {
  product: Types.ObjectId;
  productName: string;
  variantSku: string;
  attributeName: string;
  attributeValue: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

export interface IStoreSaleReturnItem {
  variantSku: string;
  quantity: number;
  amount: number;
}

export interface IStoreSaleReturn {
  _id: Types.ObjectId;
  items: IStoreSaleReturnItem[];
  amount: number;
  refundMethod: StorePaymentMethod;
  cashSession: Types.ObjectId;
  reason?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  creditNote?: StoreSaleFiscalReceipt;
}

export interface IStoreSale {
  saleNumber: number;
  cashSession: Types.ObjectId;
  seller: Types.ObjectId;
  items: IStoreSaleItem[];
  subtotal: number;
  discount?: { type: StoreDiscountType; value: number; amount: number };
  total: number;
  paymentMethod: StorePaymentMethod;
  cashReceived?: number;
  change?: number;
  paymentReference?: string;
  customer: { name?: string; email?: string };
  notes?: string;
  status: StoreSaleStatus;
  voidedAt?: Date;
  voidedBy?: Types.ObjectId;
  voidReason?: string;
  returns: IStoreSaleReturn[];
  emailSentTo: string[];
  /** Reservado para ARCA/AFIP: sin integración todavía, queda vacío. */
  fiscalReceipt?: StoreSaleFiscalReceipt;
  createdAt: Date;
}

export type StoreSaleDocument = HydratedDocument<IStoreSale>;

const PAYMENT_METHODS = ["cash", "debit", "credit", "transfer"];

const storeSaleItemSchema = new Schema<IStoreSaleItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    variantSku: { type: String, required: true, uppercase: true, trim: true },
    attributeName: { type: String, required: true },
    attributeValue: { type: String, required: true },
    image: { type: String },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const fiscalReceiptSchema = new Schema(
  {
    type: String,
    pointOfSale: Number,
    number: Number,
    cae: String,
    caeExpiresAt: String,
    status: { type: String, enum: ["pending", "issued", "rejected"] },
    issuedAt: String,
  },
  { _id: false },
);

const storeSaleReturnSchema = new Schema<IStoreSaleReturn>({
  items: {
    type: [
      new Schema<IStoreSaleReturnItem>(
        {
          variantSku: { type: String, required: true, uppercase: true },
          quantity: { type: Number, required: true, min: 1 },
          amount: { type: Number, required: true, min: 0 },
        },
        { _id: false },
      ),
    ],
    required: true,
  },
  amount: { type: Number, required: true, min: 0 },
  refundMethod: { type: String, enum: PAYMENT_METHODS, required: true },
  cashSession: { type: Schema.Types.ObjectId, ref: "CashSession", required: true },
  reason: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: () => new Date() },
  creditNote: { type: fiscalReceiptSchema },
});

const storeSaleSchema = new Schema<IStoreSale>(
  {
    saleNumber: { type: Number, required: true, unique: true },
    cashSession: { type: Schema.Types.ObjectId, ref: "CashSession", required: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: {
      type: [storeSaleItemSchema],
      required: true,
      validate: {
        validator: (v: IStoreSaleItem[]) => v.length > 0,
        message: "La venta debe tener al menos un ítem",
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: {
      type: new Schema(
        {
          type: { type: String, enum: ["percent", "amount"], required: true },
          value: { type: Number, required: true, min: 0 },
          amount: { type: Number, required: true, min: 0 },
        },
        { _id: false },
      ),
    },
    total: { type: Number, required: true, min: 1 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    cashReceived: { type: Number, min: 0 },
    change: { type: Number, min: 0 },
    paymentReference: { type: String, trim: true },
    customer: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ["completed", "partially_returned", "returned", "voided"],
      default: "completed",
      required: true,
    },
    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    voidReason: { type: String, trim: true },
    returns: { type: [storeSaleReturnSchema], default: [] },
    emailSentTo: { type: [String], default: [] },
    fiscalReceipt: { type: fiscalReceiptSchema },
  },
  { timestamps: true },
);

storeSaleSchema.index({ cashSession: 1, createdAt: -1 });
storeSaleSchema.index({ createdAt: -1 });
storeSaleSchema.index({ status: 1, createdAt: -1 });
storeSaleSchema.index({ "returns.cashSession": 1 });

export const StoreSale =
  (mongoose.models.StoreSale as Model<IStoreSale>) ??
  model<IStoreSale>("StoreSale", storeSaleSchema);
