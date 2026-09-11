import { Paperclip } from "lucide-react";
import { useParams } from "react-router-dom";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { OrderSummaryCard } from "@/components/orders/OrderSummaryCard";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useAdminOrder } from "@/hooks/admin/useAdminOrder";
import { updateOrderStatus, type UpdateOrderStatusInput } from "@/lib/adminOrdersApi";

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { order, isLoading, error, setOrder } = useAdminOrder(id);

  async function handleStatusUpdate(input: UpdateOrderStatusInput) {
    if (!id) return;
    const result = await updateOrderStatus(id, input);
    setOrder(result.order);
  }

  if (isLoading) return <Spinner label="Buscando el pedido…" />;
  if (error || !order) return <p className="text-sm text-text-muted">Pedido no encontrado.</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text">Pedido #{order.orderNumber}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <OrderSummaryCard order={order} />

        <div className="flex flex-col gap-6">
          <Card>
            <p className="mb-4 font-display text-lg text-text">Actualizar estado</p>
            <OrderStatusForm order={order} onSubmit={handleStatusUpdate} />
          </Card>

          {order.receiptUrl && (
            <Card>
              <div className="flex items-center gap-2">
                <Paperclip className="size-4 text-text-muted" />
                <p className="font-display text-lg text-text">Comprobante</p>
              </div>
              <a
                href={order.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-medium text-accent-deep hover:underline"
              >
                Ver comprobante adjunto
              </a>
            </Card>
          )}

          {order.statusHistory.length > 0 && (
            <Card>
              <p className="mb-4 font-display text-lg text-text">Historial</p>
              <div className="flex flex-col gap-3">
                {[...order.statusHistory].reverse().map((entry, index) => (
                  <div key={index} className="text-sm">
                    <p className="font-medium text-text">{entry.status}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(entry.changedAt).toLocaleString("es-AR")}
                    </p>
                    {entry.note && <p className="text-xs text-text-muted">{entry.note}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
