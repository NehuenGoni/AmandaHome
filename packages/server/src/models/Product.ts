import type { ImageSource } from "@amanda/shared";
import { slugify } from "@amanda/shared";
import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export interface IProductImage {
  url: string;
  source: ImageSource;
  alt?: string;
  order: number;
}

/**
 * El atributo distintivo de la variante es genérico (nombre/valor) para
 * cubrir distintos rubros de HomeDeco: color, tamaño, presentación, etc.
 */
export interface IProductVariant {
  sku: string;
  attributeName: string;
  attributeValue: string;
  price: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  weight?: number;
  barcode?: string;
}

export interface IProduct {
  name: string;
  slug: string;
  description?: string;
  category: Types.ObjectId;
  brand?: string;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  images: IProductImage[];
  variants: IProductVariant[];
}

export type ProductDocument = HydratedDocument<IProduct>;

const productImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true, trim: true },
    source: { type: String, enum: ["cloudinary", "external"], required: true },
    alt: { type: String, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const productVariantSchema = new Schema<IProductVariant>({
  sku: { type: String, required: true, uppercase: true, trim: true },
  attributeName: { type: String, required: true, trim: true },
  attributeValue: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  lowStockThreshold: { type: Number, required: true, min: 0, default: 0 },
  weight: { type: Number, min: 0 },
  barcode: { type: String, trim: true },
});

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    brand: { type: String, trim: true },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    images: { type: [productImageSchema], default: [] },
    variants: {
      type: [productVariantSchema],
      default: [],
      validate: {
        validator: (variants: IProductVariant[]) => variants.length > 0,
        message: "El producto debe tener al menos una variante",
      },
    },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", description: "text", tags: "text", brand: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ "variants.sku": 1 }, { unique: true });

productSchema.pre("validate", function generateSlug(next) {
  if (this.isModified("slug") && this.slug) {
    this.slug = slugify(this.slug);
  } else if (this.isModified("name")) {
    this.slug = slugify(this.name);
  }
  next();
});

export const Product = model<IProduct>("Product", productSchema);
