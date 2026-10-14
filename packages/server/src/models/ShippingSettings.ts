import mongoose, { Schema, model, type HydratedDocument, type Model } from "mongoose";

export interface IShippingPickupSettings {
  enabled: boolean;
  address?: string;
  hours?: string;
  instructions?: string;
}

export interface IShippingHomeSettings {
  enabled: boolean;
  /** Centavos: precio usado si el correo no está configurado o no responde. */
  fallbackCost: number;
}

export interface IShippingPackageDefaults {
  /** Gramos. */
  weight: number;
  /** Centímetros. */
  height: number;
  width: number;
  length: number;
}

export interface IShippingSettings {
  pickup: IShippingPickupSettings;
  home: IShippingHomeSettings;
  freeShippingThreshold?: number;
  originPostalCode: string;
  defaultPackage: IShippingPackageDefaults;
}

export type ShippingSettingsDocument = HydratedDocument<IShippingSettings>;

const pickupSchema = new Schema<IShippingPickupSettings>(
  {
    enabled: { type: Boolean, required: true, default: true },
    address: { type: String, trim: true },
    hours: { type: String, trim: true },
    instructions: { type: String, trim: true },
  },
  { _id: false },
);

const homeSchema = new Schema<IShippingHomeSettings>(
  {
    enabled: { type: Boolean, required: true, default: true },
    fallbackCost: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const packageDefaultsSchema = new Schema<IShippingPackageDefaults>(
  {
    weight: { type: Number, required: true, min: 1, default: 500 },
    height: { type: Number, required: true, min: 1, default: 15 },
    width: { type: Number, required: true, min: 1, default: 15 },
    length: { type: Number, required: true, min: 1, default: 15 },
  },
  { _id: false },
);

const shippingSettingsSchema = new Schema<IShippingSettings>(
  {
    pickup: { type: pickupSchema, required: true, default: () => ({ enabled: true }) },
    home: { type: homeSchema, required: true, default: () => ({ enabled: true, fallbackCost: 0 }) },
    freeShippingThreshold: { type: Number, min: 0 },
    originPostalCode: { type: String, required: true, trim: true, default: "1000" },
    defaultPackage: { type: packageDefaultsSchema, required: true, default: () => ({}) },
  },
  { timestamps: true },
);

export const ShippingSettings =
  (mongoose.models.ShippingSettings as Model<IShippingSettings>) ??
  model<IShippingSettings>("ShippingSettings", shippingSettingsSchema);
