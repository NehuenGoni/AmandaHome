import type { PublicProduct } from "@amanda/shared";

export function getMinPrice(product: Pick<PublicProduct, "variants">): number {
  return Math.min(...product.variants.map((v) => v.price));
}

export function hasPriceRange(product: Pick<PublicProduct, "variants">): boolean {
  const prices = new Set(product.variants.map((v) => v.price));
  return prices.size > 1;
}

export function getTotalStock(product: Pick<PublicProduct, "variants">): number {
  return product.variants.reduce((sum, v) => sum + v.stock, 0);
}
