import { formatMoney } from "@amanda/shared";
import type { OrderStatus } from "@amanda/shared";
import { AlertTriangle, ShoppingCart } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useAdminOrders } from "@/hooks/admin/useAdminOrders";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "pending", label: "Pendiente de pago" },
  { value: "confirmed", label: "Confirmado" },
  { value: "preparing", label: "En preparación" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregado" },
  { value: "cancelled", label: "Cancelado" },
];

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get("status") as OrderStatus | null) ?? undefined;
  const needsReview = searchParams.get("needsReview") === "true";
  const page = Number(searchParams.get("page") ?? "1");

  const { data, isLoading } = useAdminOrders({ page, limit: PAGE_SIZE, status, needsReview: needsReview || undefined });

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
      <h1 className="font-display text-2xl text-text">Pedidos</h1>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="max-w-xs"
          value={status ?? ""}
          onChange={(e) => updateParams({ status: e.target.value || undefined })}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <button
          type="button"
          onClick={() => updateParams({ needsReview: needsReview ? undefined : "true" })}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
            needsReview
              ? "border-accent2/40 bg-accent2/10 text-accent2-deep"
              : "border-border bg-surface text-text-muted hover:bg-surface-alt"
          }`}
        >
          <AlertTriangle className="size-4" /> Requiere revisión
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : data && data.items.length > 0 ? (
        <>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {data.items.map((order) => (
              <Link
                key={order._id}
                to={`/admin/pedidos/${order._id}`}
                className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-alt"
              >
                <div>
                  <p className="text-sm font-medium text-text">Pedido #{order.orderNumber}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(order.createdAt).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-text">{formatMoney(order.total)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => updateParams({ page: String(p) })} />
        </>
      ) : (
        <EmptyState icon={ShoppingCart} title="No hay pedidos" description="Los pedidos de tus clientes van a aparecer acá." />
      )}
    </div>
  );
}
