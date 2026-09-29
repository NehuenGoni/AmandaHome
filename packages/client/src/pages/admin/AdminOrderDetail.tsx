import { AlertTriangle, Paperclip } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { OrderSummaryCard } from "@/components/orders/OrderSummaryCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Spinner } from "@/components/ui/Spinner";
import { useAdminOrder } from "@/hooks/admin/useAdminOrder";
import { ApiError } from "@/lib/apiClient";
import {
  reactivateOrder,
  refundOrder,
  updateOrderStatus,
  type UpdateOrderStatusInput,
} from "@/lib/adminOrdersApi";

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { order, isLoading, error, setOrder } = useAdminOrder(id);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  async function handleStatusUpdate(input: UpdateOrderStatusInput) {
    if (!id) return;
    const result = await updateOrderStatus(id, input);
    setOrder(result.order);
  }

  async function handleReactivate() {
    if (!id) return;
    if (!window.confirm("¿Reactivar este pedido? Se va a descontar el stock de nuevo.")) return;
    setIsResolving(true);
    setResolutionError(null);
    try {
      const result = await reactivateOrder(id);
      setOrder(result.order);
    } catch (err) {
      setResolutionError(err instanceof ApiError ? err.message : "No pudimos reactivar el pedido");
    } finally {
      setIsResolving(false);
    }
  }

  async function handleRefund() {
    if (!id) return;
    if (!window.confirm("¿Reembolsar este pago en Mercado Pago?")) return;
    setIsResolving(true);
    setResolutionError(null);
    try {
      const result = await refundOrder(id);
      setOrder(result.order);
    } catch (err) {
      setResolutionError(err instanceof ApiError ? err.message : "No pudimos reembolsar el pago");
    } finally {
      setIsResolving(false);
    }
  }

  if (isLoading) return <Spinner label="Buscando el pedido…" />;
  if (error || !order) return <p className="text-sm text-text-muted">Pedido no encontrado.</p>;

  const needsReview = order.paymentIssue && !order.paymentIssue.resolvedAt;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text">Pedido #{order.orderNumber}</h1>

      {needsReview && (
        <Card className="border-accent2/40 bg-accent2/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-accent2-deep" />
            <div className="flex-1">
              <p className="font-display text-lg text-text">Pago recibido en un pedido cancelado</p>
              <p className="mt-1 text-sm text-text-muted">
                Mercado Pago aprobó un pago para este pedido después de que se cancelara. Reactivalo si
                todavía hay stock, o devolvé la plata.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" isLoading={isResolving} onClick={handleReactivate}>
                  Reactivar pedido
                </Button>
                <Button size="sm" variant="danger" isLoading={isResolving} onClick={handleRefund}>
                  Reembolsar
                </Button>
              </div>
              {resolutionError && (
                <div className="mt-3">
                  <InlineMessage tone="error">{resolutionError}</InlineMessage>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

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
