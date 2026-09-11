import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { SearchBar } from "@/components/catalog/SearchBar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";

const PAGE_SIZE = 12;

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useCategories();

  const categorySlug = searchParams.get("categoria") ?? undefined;
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

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (!("page" in next)) params.delete("page");
    setSearchParams(params);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl text-text">Catálogo</h1>
        <SearchBar value={search} onChange={(q) => updateParams({ q: q || undefined })} />
        <CategoryFilter
          categories={categories}
          activeSlug={categorySlug}
          onSelect={(category) => updateParams({ categoria: category?.slug })}
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
