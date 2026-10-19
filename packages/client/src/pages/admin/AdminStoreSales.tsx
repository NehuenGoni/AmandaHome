import { STORE_PAYMENT_METHODS, formatMoney, type StorePaymentMethod, type StoreSaleStatus } from "@amanda/shared";
import { Receipt, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useStoreSales } from "@/hooks/admin/useStoreSales";
import {
  PAYMENT_METHOD_LABELS,
  STORE_SALE_STATUS_LABELS,
  STORE_SALE_STATUS_TONES,
  formatDateTime,
} from "@/lib/storeSaleLabels";

// Argentina no tiene horario de verano: un día calendario local siempre es UTC-3.
const startOfDay = (date: string) => new Date(`${date}T00:00:00-03:00`).toISOString();
const endOfDay = (date: string) => new Date(`${date}T23:59:59.999-03:00`).toISOString();

export default function AdminStoreSales() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod | "">("");
  const [status, setStatus] = useState<StoreSaleStatus | "">("");

  const { data, isLoading, error } = useStoreSales({
    page,
    from: from ? startOfDay(from) : undefined,
    to: to ? endOfDay(to) : undefined,
    paymentMethod: paymentMethod || undefined,
    status: status || undefined,
  });

  function resetPageThen<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPage(1);
      setter(value);
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-text">Ventas del local</h1>
        <Link to="/admin/ventas">
          <Button>
            <ShoppingBag className="size-4" /> Nueva venta
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Desde" type="date" value={from} onChange={(e) => resetPageThen(setFrom)(e.target.value)} />
        <Input label="Hasta" type="date" value={to} onChange={(e) => resetPageThen(setTo)(e.target.value)} />
        <Select
          label="Medio de pago"
          value={paymentMethod}
          onChange={(e) => resetPageThen(setPaymentMethod)(e.target.value as StorePaymentMethod | "")}
        >
          <option value="">Todos</option>
          {STORE_PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </Select>
        <Select
          label="Estado"
          value={status}
          onChange={(e) => resetPageThen(setStatus)(e.target.value as StoreSaleStatus | "")}
        >
          <option value="">Todos</option>
          {(Object.keys(STORE_SALE_STATUS_LABELS) as StoreSaleStatus[]).map((s) => (
            <option key={s} value={s}>
              {STORE_SALE_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      {error && <InlineMessage tone="error">{error}</InlineMessage>}

      {isLoading ? (
        <Spinner />
      ) : data && data.items.length > 0 ? (
        <>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {data.items.map((sale) => (
              <Link
                key={sale._id}
                to={`/admin/ventas/${sale._id}`}
                className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-alt"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">
                    Venta #{sale.saleNumber}
                    {sale.customer.name && <span className="text-text-muted"> · {sale.customer.name}</span>}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatDateTime(sale.createdAt)} · {PAYMENT_METHOD_LABELS[sale.paymentMethod]} ·{" "}
                    {sale.items.reduce((n, i) => n + i.quantity, 0)} u.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums text-text">{formatMoney(sale.total)}</span>
                  <Badge tone={STORE_SALE_STATUS_TONES[sale.status]}>{STORE_SALE_STATUS_LABELS[sale.status]}</Badge>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon={Receipt} title="No hay ventas con esos filtros" />
      )}
    </div>
  );
}
