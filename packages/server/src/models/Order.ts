import type { OrderStatus, PaymentStatus } from "@amanda/shared";
import { Schema, model, type HydratedDocument, type Types } from "mongoose";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
];
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "approved", "rejected", "refunded", "cancelled"];

/** Snapshot inmutable de la variante al momento de compra. */
export interface IOrderItem {
  product: Types.ObjectId;
  productName: string;
  variantSku: string;
  attributeName: string;
  attributeValue: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface IOrderStatusHistoryEntry {
  status: OrderStatus;
  changedAt: Date;
  changedBy?: Types.ObjectId;
  note?: string;
}

export interface IShippingAddressSnapshot {
  label?: string;
  street: string;
  number?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface IOrder {
  orderNumber: number;
  customer: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  statusHistory: IOrderStatusHistoryEntry[];
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paymentDetails?: Record<string, unknown>;
  shippingMethod: string;
  shippingAddress: IShippingAddressSnapshot;
  trackingNumber?: string;
  notes?: string;
}

export type OrderDocument = HydratedDocument<IOrder>;

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    variantSku: { type: String, required: true },
    attributeName: { type: String, required: true },
    attributeValue: { type: String, required: true },
    image: { type: String },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const shippingAddressSnapshotSchema = new Schema<IShippingAddressSnapshot>(
  {
    label: { type: String },
    street: { type: String, required: true },
    number: { type: String },
    city: { type: String, required: true },
    province: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String },
  },
  { _id: false },
);

const statusHistoryEntrySchema = new Schema<IOrderStatusHistoryEntry>(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    changedAt: { type: Date, required: true, default: () => new Date() },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
    note: { type: String },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: Number, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: { validator: (v: IOrderItem[]) => v.length > 0, message: "La orden debe tener al menos un ítem" },
    },
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: "pending" },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
    paymentDetails: { type: Schema.Types.Mixed },
    shippingMethod: { type: String, required: true },
    shippingAddress: { type: shippingAddressSnapshotSchema, required: true },
    trackingNumber: { type: String },
    notes: { type: String },
  },
  { timestamps: true },
);

orderSchema.index({ customer: 1, createdAt: -1 });

export const Order = model<IOrder>("Order", orderSchema);
