import type { Product } from "@amanda/shared";
import { motion } from "framer-motion";
import { ImageOff } from "lucide-react";
import { Link } from "react-router-dom";
import { PriceTag } from "@/components/ui/PriceTag";
import { getMinPrice, getTotalStock, hasPriceRange } from "@/lib/productPricing";

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];
  const outOfStock = getTotalStock(product) <= 0;

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
      <Link
        to={`/productos/${product.slug}`}
        className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface"
      >
        <div className="relative aspect-square overflow-hidden bg-surface-alt">
          {image ? (
            <img
              src={image.url}
              alt={image.alt ?? product.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-text-muted">
              <ImageOff className="size-8" />
            </div>
          )}
          {outOfStock && (
            <span className="absolute left-3 top-3 rounded-full bg-text/85 px-2.5 py-1 text-xs font-medium text-bg">
              Sin stock
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="font-display text-base text-text">{product.name}</p>
          <p className="text-sm font-medium text-accent-deep">
            {hasPriceRange(product) && <span className="text-text-muted">Desde </span>}
            <PriceTag cents={getMinPrice(product)} />
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
