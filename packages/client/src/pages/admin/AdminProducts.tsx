import { formatMoney } from "@amanda/shared";
import { Package, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useAdminProducts } from "@/hooks/admin/useAdminProducts";
import { ApiError } from "@/lib/apiClient";
import { deleteProduct } from "@/lib/adminProductsApi";
import { getMinPrice, getTotalStock, hasPriceRange } from "@/lib/productPricing";

const PAGE_SIZE = 20;

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, reload } = useAdminProducts({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    includeInactive: true,
  });

  async function handleDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteProduct(pendingDelete);
      setPendingDelete(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos eliminar el producto");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-text">Productos</h1>
        <Link
          to="/admin/productos/nuevo"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-strong"
        >
          <Plus className="size-4" /> Nuevo producto
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <Input
          placeholder="Buscar productos…"
          className="pl-10"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {error && <InlineMessage tone="error">{error}</InlineMessage>}

      {isLoading ? (
        <Spinner />
      ) : data && data.items.length > 0 ? (
        <>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {data.items.map((product) => (
              <div key={product._id} className="flex items-center justify-between gap-3 px-5 py-4">
                <Link to={`/admin/productos/${product._id}`} className="flex min-w-0 items-center gap-3">
                  {product.images[0] ? (
                    <img
                      src={product.images[0].url}
                      alt=""
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-muted">
                      <Package className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{product.name}</p>
                    <p className="text-xs text-text-muted">
                      {hasPriceRange(product) ? "Desde " : ""}
                      {formatMoney(getMinPrice(product))} · stock {getTotalStock(product)}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  {!product.isActive && <Badge tone="neutral">Inactivo</Badge>}
                  {product.isFeatured && <Badge tone="accent">Destacado</Badge>}
                  <button
                    type="button"
                    onClick={() => setPendingDelete(product._id)}
                    aria-label={`Eliminar ${product.name}`}
                    className="flex size-8 items-center justify-center rounded-full text-accent2-deep hover:bg-surface-alt"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon={Package} title="No hay productos" description="Creá el primero para empezar a vender." />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="¿Eliminar este producto?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        tone="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
