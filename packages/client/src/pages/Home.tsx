import { motion } from "framer-motion";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Spinner } from "@/components/ui/Spinner";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";

export default function Home() {
  const { data, isLoading } = useProducts({ isFeatured: true, limit: 8 });
  const { categories } = useCategories();

  return (
    <div className="flex flex-col gap-16">
      <section className="relative isolate flex min-h-[28rem] items-end overflow-hidden rounded-3xl px-6 py-12 sm:min-h-[32rem] sm:px-12 md:items-center">
        {/* Foto del local como fondo; el texto va siempre en crema sobre el velo oscuro, en ambos temas. */}
        <motion.img
          src="/local-estanterias.jpeg"
          alt=""
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 -z-20 size-full object-cover object-[70%_40%] md:object-[center_38%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#211e1a]/90 via-[#211e1a]/55 to-[#211e1a]/10 md:bg-gradient-to-r md:from-[#211e1a]/85 md:via-[#211e1a]/50 md:to-transparent" />
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="flex max-w-lg flex-col gap-5"
        >
          <span className="w-fit rounded-full bg-[#f5f0e4]/15 px-3 py-1 text-xs font-medium text-[#f5f0e4] backdrop-blur-sm">
            Nueva colección
          </span>
          <h1 className="font-display text-4xl leading-tight text-[#f5f0e4] sm:text-5xl">
            Objetos con carácter para tu casa
          </h1>
          <p className="max-w-md text-[#f5f0e4]/80">
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

      <section className="relative isolate overflow-hidden rounded-3xl px-6 py-14 sm:px-12 sm:py-20">
        <img
          src="/local-mostrador.jpeg"
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-20 size-full object-cover object-[25%_35%]"
        />
        <div className="absolute inset-0 -z-10 bg-[#211e1a]/65 md:bg-gradient-to-l md:from-[#211e1a]/90 md:via-[#211e1a]/65 md:to-[#211e1a]/20" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="ml-auto flex max-w-md flex-col gap-6 text-[#f5f0e4]"
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-3xl sm:text-4xl">Visitanos</h2>
            <p className="text-[#f5f0e4]/80">Vení a conocer el local y ver cada pieza en persona.</p>
          </div>
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-[#c69a3b]" />
              <div>
                <p className="font-medium">Av. El Callao 1585</p>
                <p className="text-[#f5f0e4]/75">Grand Bourg, Buenos Aires</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-[#c69a3b]" />
              <div>
                <p className="font-medium">Lunes a sábados</p>
                <p className="text-[#f5f0e4]/75">9:30 a 13 h · 16:30 a 20 h</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://www.google.com/maps/search/?api=1&query=Av.+El+Callao+1585,+Grand+Bourg,+Buenos+Aires"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#c69a3b] px-6 py-3 text-sm font-medium text-[#211e1a] transition-colors hover:bg-[#d6ab4d]"
            >
              Cómo llegar <ArrowRight className="size-4" />
            </a>
            <a
              href="https://wa.me/5491137582353"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#f5f0e4]/40 px-6 py-3 text-sm font-medium text-[#f5f0e4] backdrop-blur-sm transition-colors hover:bg-[#f5f0e4]/10"
            >
              <WhatsAppIcon className="size-4" /> Escribinos
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
