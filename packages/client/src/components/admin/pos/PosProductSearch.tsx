import type { Product, ProductVariant, StoreProductLookup } from "@amanda/shared";
import { formatMoney } from "@amanda/shared";
import { ScanBarcode } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Input } from "@/components/ui/Input";
import { useAdminProducts } from "@/hooks/admin/useAdminProducts";
import { ApiError } from "@/lib/apiClient";
import { lookupStoreProduct } from "@/lib/storeSalesApi";

const SEARCH_DEBOUNCE_MS = 350;

function toLookup(product: Product, variant: ProductVariant): StoreProductLookup {
  return {
    productId: product._id,
    productName: product.name,
    image: product.images[0]?.url,
    variantSku: variant.sku,
    attributeName: variant.attributeName,
    attributeValue: variant.attributeValue,
    price: variant.price,
    stock: variant.stock,
    barcode: variant.barcode,
  };
}

interface PosProductSearchProps {
  onSelect: (product: StoreProductLookup) => void;
}

/**
 * Un solo campo para todo: el lector de código de barras "tipea" el código y
 * manda Enter (búsqueda exacta por código/SKU); si se escribe a mano, además
 * aparecen resultados por nombre.
 */
export function PosProductSearch({ onSelect }: PosProductSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [isLooking, setIsLooking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { data } = useAdminProducts({ search: debounced || undefined, limit: 8 });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function pick(product: StoreProductLookup) {
    onSelect(product);
    setQuery("");
    setDebounced("");
    setMessage(null);
    inputRef.current?.focus();
  }

  async function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = query.trim();
    if (!code || isLooking) return;

    setIsLooking(true);
    setMessage(null);
    try {
      const { result } = await lookupStoreProduct(code);
      pick(result);
    } catch (err) {
      // 404 no es un error: quizá escribieron un nombre, y los resultados de abajo ya lo cubren.
      if (err instanceof ApiError && err.status === 404) {
        setMessage("No hay ningún producto con ese código. Probá con los resultados de búsqueda.");
      } else {
        setMessage(err instanceof ApiError ? err.message : "No pudimos buscar el producto");
      }
    } finally {
      setIsLooking(false);
      inputRef.current?.focus();
    }
  }

  const showResults = debounced.length > 0 && data;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <ScanBarcode className="pointer-events-none absolute left-4 top-[1.375rem] size-4 -translate-y-1/2 text-text-muted" />
        <Input
          ref={inputRef}
          aria-label="Escanear código o buscar producto"
          placeholder="Escaneá un código de barras o buscá por nombre / SKU…"
          className="pl-10"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setMessage(null);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>

      {message && <InlineMessage tone="error">{message}</InlineMessage>}

      {showResults && (
        <div className="flex max-h-[28rem] flex-col divide-y divide-border overflow-y-auto rounded-2xl border border-border bg-surface">
          {data.items.flatMap((product) =>
            product.variants.map((variant) => {
              const outOfStock = variant.stock <= 0;
              return (
                <button
                  key={variant.sku}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => pick(toLookup(product, variant))}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-text">{product.name}</span>
                    <span className="block text-xs text-text-muted">
                      {variant.attributeName}: {variant.attributeValue} · SKU {variant.sku} ·{" "}
                      {outOfStock ? "sin stock" : `stock ${variant.stock}`}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-text">{formatMoney(variant.price)}</span>
                </button>
              );
            }),
          )}
          {data.items.length === 0 && <p className="px-4 py-3 text-sm text-text-muted">Sin resultados.</p>}
        </div>
      )}
    </div>
  );
}
