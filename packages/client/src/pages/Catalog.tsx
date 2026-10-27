import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { SearchBar } from "@/components/catalog/SearchBar";
import { Seo, truncateDescription } from "@/components/seo/Seo";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { trackSearch, trackViewItemList } from "@/lib/analytics";
import { buildBreadcrumbJsonLd } from "@/lib/structuredData";
import NotFound from "./NotFound";

const PAGE_SIZE = 12;

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { categories, isLoading: categoriesLoading } = useCategories();

  // La categoría vive en el path (/categoria/:slug) para que Google la indexe como página propia.
  const { slug: categorySlug } = useParams<{ slug: string }>();
  const search = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === categorySlug),
    [categories, categorySlug],
  );

  const { data, isLoading } = useProducts({
    page,
    limit: PAGE_SIZE,
    category: activeCategory?._id,
    search: search || undefined,
  });

  useEffect(() => {
    if (data?.items.length) trackViewItemList(activeCategory?.name ?? "Catálogo", data.items);
  }, [data, activeCategory]);

  useEffect(() => {
    if (search) trackSearch(search);
  }, [search]);

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (!("page" in next)) params.delete("page");
    setSearchParams(params);
  }

  function selectCategory(slug: string | undefined) {
    const params = new URLSearchParams(searchParams);
    params.delete("page");
    const query = params.toString();
    navigate(`${slug ? `/categoria/${slug}` : "/catalogo"}${query ? `?${query}` : ""}`);
  }

  if (categorySlug && !categoriesLoading && !activeCategory) return <NotFound />;

  const title = activeCategory?.name ?? "Catálogo";
  const path = activeCategory ? `/categoria/${activeCategory.slug}` : "/catalogo";
  // Las búsquedas y las páginas > 1 duplican contenido: no se indexan, pero sí se siguen los links.
  const isFiltered = Boolean(search) || page > 1;

  return (
    <div className="flex flex-col gap-6">
      <Seo
        title={activeCategory ? `${activeCategory.name} para tu casa` : "Catálogo de decoración y textiles"}
        description={
          truncateDescription(activeCategory?.description) ??
          (activeCategory
            ? `Descubrí ${activeCategory.name.toLowerCase()} en Amanda Home & Deco. Comprá online o pasá por el local en Grand Bourg.`
            : "Todo el catálogo de Amanda Home & Deco: textiles, cerámica y objetos de decoración para tu casa.")
        }
        path={path}
        image={activeCategory?.image}
        noindex={isFiltered}
        jsonLd={
          activeCategory
            ? buildBreadcrumbJsonLd([
                { name: "Inicio", path: "/" },
                { name: activeCategory.name, path },
              ])
            : undefined
        }
      />
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl text-text">{title}</h1>
        {activeCategory?.description && (
          <p className="max-w-2xl text-sm leading-relaxed text-text-muted">{activeCategory.description}</p>
        )}
        <SearchBar value={search} onChange={(q) => updateParams({ q: q || undefined })} />
        <CategoryFilter
          categories={categories}
          activeSlug={categorySlug}
          onSelect={(category) => selectCategory(category?.slug)}
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <ProductGrid products={data?.items ?? []} />
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                Anterior
              </Button>
              <span className="text-sm text-text-muted">
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
