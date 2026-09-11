import { formatMoney } from "@amanda/shared";
import { Package } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useMyOrders } from "@/hooks/useMyOrders";

export default function AccountOrders() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyOrders(page);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text">Mis pedidos</h1>

      {isLoading ? (
        <Spinner />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Todavía no hiciste ningún pedido"
          description="Cuando compres algo, vas a poder ver el estado acá."
          action={
            <Link to="/catalogo">
              <Button>Ver catálogo</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {data.items.map((order) => (
              <Link key={order._id} to={`/cuenta/pedidos/${order._id}`}>
                <Card className="flex items-center justify-between transition-colors hover:border-accent">
                  <div>
                    <p className="font-medium text-text">Pedido #{order.orderNumber}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(order.createdAt).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-text">{formatMoney(order.total)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-text-muted">
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
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
