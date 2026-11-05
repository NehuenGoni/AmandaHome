import { BUSINESS } from "@amanda/shared";
import { motion } from "framer-motion";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/Button";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Spinner } from "@/components/ui/Spinner";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { trackContactClick, trackViewItemList } from "@/lib/analytics";
import { buildLocalBusinessJsonLd, buildWebSiteJsonLd } from "@/lib/structuredData";

export default function Home() {
  const { data, isLoading } = useProducts({ isFeatured: true, limit: 8 });
  const { categories } = useCategories();

  useEffect(() => {
    if (data?.items.length) trackViewItemList("Destacados", data.items);
  }, [data]);

  return (
    <div className="flex flex-col gap-20 sm:gap-24">
      <Seo
        title="Decoración, textiles y cerámica en Grand Bourg"
        rawTitle
        description="Amanda Home & Deco: textiles, cerámica y objetos de decoración para tu casa. Comprá online o visitá el local en Av. El Callao 1585, Grand Bourg."
        path="/"
        jsonLd={[buildLocalBusinessJsonLd(), buildWebSiteJsonLd()]}
      />
      <section className="relative isolate flex min-h-[min(46rem,calc(100svh-7rem))] items-end overflow-hidden rounded-3xl px-6 py-12 sm:px-12 md:items-center md:px-16 after:absolute after:inset-0 after:-z-10 after:bg-gradient-to-t after:from-photo-ink/90 after:via-photo-ink/55 after:to-photo-ink/10 md:after:bg-gradient-to-r md:after:from-photo-ink/85 md:after:via-photo-ink/50 md:after:to-transparent">
        {/* Foto del local como fondo; el texto va siempre en crema sobre el velo oscuro, en ambos temas. */}
        <motion.img
          src="/local-estanterias.jpeg"
          alt="Estanterías del local Amanda Home & Deco con textiles y cerámica"
          width={1200}
          height={1600}
          fetchPriority="high"
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 -z-20 size-full object-cover object-[70%_40%] md:object-[center_38%]"
        />
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="flex max-w-2xl flex-col gap-6"
        >
          <span className="w-fit rounded-full bg-on-photo/15 px-4 py-1.5 text-base font-medium text-on-photo backdrop-blur-sm">
            Nueva colección
          </span>
          <h1 className="font-display text-5xl leading-[1.05] text-on-photo sm:text-6xl md:text-7xl">
            Objetos con carácter para tu casa
          </h1>
          <p className="max-w-xl text-xl text-on-photo/90">
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
        <section className="flex flex-col gap-6">
          <h2 className="font-display text-3xl text-text sm:text-4xl">Categorías</h2>
          <div className="flex flex-wrap gap-3">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category._id}
                to={`/categoria/${category.slug}`}
                className="inline-flex min-h-12 items-center rounded-full border-2 border-field bg-surface px-6 py-2 text-base font-medium text-text transition-colors hover:border-accent-deep hover:bg-surface-alt"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl text-text sm:text-4xl">Destacados</h2>
          <Link to="/catalogo" className="text-lg font-medium text-accent-deep underline underline-offset-4 hover:text-text">
            Ver todo
          </Link>
        </div>
        {isLoading ? <Spinner /> : <ProductGrid products={data?.items ?? []} />}
      </section>

      <section className="relative isolate overflow-hidden rounded-3xl px-6 py-14 sm:px-12 sm:py-24 after:absolute after:inset-0 after:-z-10 after:bg-photo-ink/65 md:after:bg-gradient-to-l md:after:from-photo-ink/90 md:after:via-photo-ink/65 md:after:to-photo-ink/20">
        <img
          src="/local-mostrador.jpeg"
          alt="Mostrador del local Amanda Home & Deco en Grand Bourg"
          loading="lazy"
          className="absolute inset-0 -z-20 size-full object-cover object-[25%_35%]"
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="ml-auto flex max-w-lg flex-col gap-8 text-on-photo"
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-4xl sm:text-5xl">Visitanos</h2>
            <p className="text-xl text-on-photo/90">Vení a conocer el local y ver cada pieza en persona.</p>
          </div>
          <div className="flex flex-col gap-5 text-lg">
            <div className="flex gap-3">
              <MapPin className="mt-1 size-6 shrink-0 text-photo-gold" />
              <div>
                <p className="font-medium">{BUSINESS.streetAddress}</p>
                <p className="text-on-photo/85">
                  {BUSINESS.locality}, {BUSINESS.region}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="mt-1 size-6 shrink-0 text-photo-gold" />
              <div>
                <p className="font-medium">Lunes a sábados</p>
                <p className="text-on-photo/85">9:30 a 13 h y 16:30 a 20 h</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={BUSINESS.mapsUrl}
              onClick={() => trackContactClick("maps", "home-visitanos")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-13 items-center gap-2 rounded-full bg-photo-gold px-7 py-3 text-lg font-medium text-photo-ink transition-[filter] hover:brightness-110"
            >
              Cómo llegar <ArrowRight className="size-5" />
            </a>
            <a
              href={BUSINESS.whatsappUrl}
              onClick={() => trackContactClick("whatsapp", "home-visitanos")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-13 items-center gap-2 rounded-full border-2 border-on-photo/60 px-7 py-3 text-lg font-medium text-on-photo backdrop-blur-sm transition-colors hover:bg-on-photo/10"
            >
              <WhatsAppIcon className="size-5" /> Escribinos
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
