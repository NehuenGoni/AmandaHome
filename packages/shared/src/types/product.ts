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
  /** Gramos. Usado para cotizar el envío. */
  weight?: number;
  /** Centímetros. Usados para cotizar el envío. */
  height?: number;
  width?: number;
  length?: number;
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
  /** Baja lógica: solo el admin ve productos archivados. */
  archivedAt?: string;
  images: ImageRef[];
  variants: ProductVariant[];
}

/** El costo es un dato interno: la API pública nunca lo devuelve. */
export type PublicProductVariant = Omit<ProductVariant, "costPrice">;

export type PublicProduct = Omit<Product, "variants"> & { variants: PublicProductVariant[] };
