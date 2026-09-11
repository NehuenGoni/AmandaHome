import type { ImageRef, WithTimestamps } from "./common.js";

/**
 * El atributo distintivo de la variante es genérico (nombre/valor) para
 * cubrir distintos rubros de HomeDeco: color, tamaño, presentación, etc.
 */
export interface ProductVariant {
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

export interface Product extends WithTimestamps {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  brand?: string;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  images: ImageRef[];
  variants: ProductVariant[];
}
