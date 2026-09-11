import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Spinner } from "@/components/ui/Spinner";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";

export default function Home() {
  const { data, isLoading } = useProducts({ isFeatured: true, limit: 8 });
  const { categories } = useCategories();

  return (
    <div className="flex flex-col gap-16">
      <section className="grid items-center gap-8 overflow-hidden rounded-3xl bg-surface px-6 py-14 sm:px-12 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-5"
        >
          <span className="w-fit rounded-full bg-support/15 px-3 py-1 text-xs font-medium text-support">
            Nueva colección
          </span>
          <h1 className="font-display text-4xl leading-tight text-text sm:text-5xl">
            Objetos con carácter para tu casa
          </h1>
          <p className="max-w-md text-text-muted">
            Textiles, cerámica y decoración elegida con cuidado. Piezas que acompañan, no que sobran.
          </p>
          <div>
            <Link to="/catalogo">
              <Button size="lg">
                Ver catálogo <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-support/20 via-accent/15 to-accent2/15"
        />
      </section>

      {categories.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl text-text">Categorías</h2>
          <div className="flex flex-wrap gap-3">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category._id}
                to={`/catalogo?categoria=${category.slug}`}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent-deep"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-text">Destacados</h2>
          <Link to="/catalogo" className="text-sm font-medium text-accent-deep hover:underline">
            Ver todo
          </Link>
        </div>
        {isLoading ? <Spinner /> : <ProductGrid products={data?.items ?? []} />}
      </section>
    </div>
  );
}
