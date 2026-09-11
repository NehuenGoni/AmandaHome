import type { Product } from "@amanda/shared";
import { motion } from "framer-motion";
import { PackageSearch } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No encontramos productos"
        description="Probá con otra búsqueda o explorá otra categoría del catálogo."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <motion.div
          key={product._id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.03, ease: [0.16, 1, 0.3, 1] }}
        >
          <ProductCard product={product} />
        </motion.div>
      ))}
    </div>
  );
}
