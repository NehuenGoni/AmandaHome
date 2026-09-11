import { formatMoney } from "@amanda/shared";
import { AlertTriangle, Clock, Package, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { useAdminOrders } from "@/hooks/admin/useAdminOrders";
import { useLowStock } from "@/hooks/admin/useLowStock";

export default function AdminDashboard() {
  const { data: pendingOrders, isLoading: loadingPending } = useAdminOrders({ status: "pending", limit: 1 });
  const { data: recentOrders, isLoading: loadingRecent } = useAdminOrders({ limit: 6 });
  const { items: lowStock, isLoading: loadingLowStock } = useLowStock();

  const isLoading = loadingPending || loadingRecent || loadingLowStock;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text">Dashboard</h1>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={Clock}
              label="Pedidos pendientes de pago"
              value={pendingOrders?.total ?? 0}
              to="/admin/pedidos?status=pending"
            />
            <StatCard
              icon={ShoppingCart}
              label="Pedidos totales"
              value={recentOrders?.total ?? 0}
              to="/admin/pedidos"
            />
            <StatCard
              icon={AlertTriangle}
              label="Variantes con stock bajo"
              value={lowStock.length}
              to="/admin/inventario"
              tone={lowStock.length > 0 ? "warning" : "neutral"}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="font-display text-lg text-text">Pedidos recientes</h2>
            {recentOrders && recentOrders.items.length > 0 ? (
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {recentOrders.items.map((order) => (
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
            ) : (
              <EmptyState icon={Package} title="Todavía no hay pedidos" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
