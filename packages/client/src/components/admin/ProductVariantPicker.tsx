import type { Product, ProductVariant } from "@amanda/shared";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { useAdminProducts } from "@/hooks/admin/useAdminProducts";

export interface VariantSelection {
  product: Product;
  variant: ProductVariant;
}

interface ProductVariantPickerProps {
  value: VariantSelection | null;
  onChange: (selection: VariantSelection) => void;
  onClear: () => void;
}

export function ProductVariantPicker({ value, onChange, onClear }: ProductVariantPickerProps) {
  const [search, setSearch] = useState("");
  const { data } = useAdminProducts({ search: search || undefined, limit: 8, includeInactive: true });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-alt px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">{value.product.name}</p>
          <p className="text-xs text-text-muted">
            {value.variant.attributeName}: {value.variant.attributeValue} · SKU {value.variant.sku}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Cambiar selección"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <Input
          placeholder="Buscar producto…"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {search && (
        <div className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {data?.items.map((product) =>
            product.variants.map((variant) => (
              <button
                key={variant.sku}
                type="button"
                onClick={() => onChange({ product, variant })}
                className="flex flex-col items-start px-4 py-2.5 text-left text-sm hover:bg-surface-alt"
              >
                <span className="font-medium text-text">{product.name}</span>
                <span className="text-xs text-text-muted">
                  {variant.attributeName}: {variant.attributeValue} · SKU {variant.sku} · stock {variant.stock}
                </span>
              </button>
            )),
          )}
          {data && data.items.length === 0 && (
            <p className="px-4 py-3 text-sm text-text-muted">Sin resultados.</p>
          )}
        </div>
      )}
    </div>
  );
}
