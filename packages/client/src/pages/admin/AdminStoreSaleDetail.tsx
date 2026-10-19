import { formatMoney } from "@amanda/shared";
import { ArrowLeft, Printer } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { SendReceiptForm } from "@/components/admin/pos/SendReceiptForm";
import { StoreSaleReturnForm } from "@/components/admin/pos/StoreSaleReturnForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useCurrentCashSession } from "@/hooks/admin/useCurrentCashSession";
import { useStoreSale } from "@/hooks/admin/useStoreSale";
import { ApiError } from "@/lib/apiClient";
import {
  PAYMENT_METHOD_LABELS,
  STORE_SALE_STATUS_LABELS,
  STORE_SALE_STATUS_TONES,
  formatDateTime,
} from "@/lib/storeSaleLabels";
import { voidStoreSale } from "@/lib/storeSalesApi";

export default function AdminStoreSaleDetail() {
  const { id } = useParams<{ id: string }>();
  const { sale, setSale, isLoading, error } = useStoreSale(id);
  const { session } = useCurrentCashSession();
  const [showVoid, setShowVoid] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  if (isLoading) return <Spinner />;
  if (error || !sale) return <InlineMessage tone="error">{error ?? "Venta no encontrada"}</InlineMessage>;

  // Anular solo vale mientras la caja de la venta siga abierta; después corresponde una devolución.
  const canVoid = sale.status === "completed" && sale.returns.length === 0 && session?._id === sale.cashSession;
  const canReturn = (sale.status === "completed" || sale.status === "partially_returned") && Boolean(session);

  async function handleVoid(e: FormEvent) {
    e.preventDefault();
    if (!window.confirm("¿Anular la venta? Se repone el stock y deja de sumar en la caja.")) return;
    setIsVoiding(true);
    setVoidError(null);
    try {
      const { sale: updated } = await voidStoreSale(sale!._id, voidReason.trim());
      setSale(updated);
      setShowVoid(false);
    } catch (err) {
      setVoidError(err instanceof ApiError ? err.message : "No pudimos anular la venta");
    } finally {
      setIsVoiding(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/admin/ventas/historial" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Ventas del local
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-text">Venta #{sale.saleNumber}</h1>
          <p className="text-sm text-text-muted">
            {formatDateTime(sale.createdAt)} · {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
            {sale.customer.name && ` · ${sale.customer.name}`}
          </p>
        </div>
        <Badge tone={STORE_SALE_STATUS_TONES[sale.status]}>{STORE_SALE_STATUS_LABELS[sale.status]}</Badge>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card className="p-0">
            <div className="divide-y divide-border">
              {sale.items.map((item) => (
                <div key={item.variantSku} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">{item.productName}</p>
                    <p className="text-xs text-text-muted">
                      {item.attributeName}: {item.attributeValue} · {item.quantity} × {formatMoney(item.unitPrice)}
                      {item.discount > 0 && ` · desc. ${formatMoney(item.discount)}`}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-text">{formatMoney(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1.5 border-t border-border px-5 py-4 text-sm">
              <div className="flex justify-between text-text-muted">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatMoney(sale.subtotal)}</span>
              </div>
              {sale.discount && (
                <div className="flex justify-between text-text-muted">
                  <span>
                    Descuento{sale.discount.type === "percent" ? ` (${sale.discount.value}%)` : ""}
                  </span>
                  <span className="tabular-nums">-{formatMoney(sale.discount.amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium text-text">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(sale.total)}</span>
              </div>
              {sale.paymentMethod === "cash" && (
                <p className="text-xs text-text-muted">
                  Recibido {formatMoney(sale.cashReceived ?? 0)} · vuelto {formatMoney(sale.change ?? 0)}
                </p>
              )}
              {sale.paymentReference && (
                <p className="text-xs text-text-muted">Referencia: {sale.paymentReference}</p>
              )}
            </div>
          </Card>

          {sale.status === "voided" && (
            <InlineMessage tone="error">
              Anulada el {sale.voidedAt ? formatDateTime(sale.voidedAt) : ""}
              {sale.voidReason ? `: ${sale.voidReason}` : ""}
            </InlineMessage>
          )}

          {sale.returns.length > 0 && (
            <Card>
              <p className="mb-3 font-display text-lg text-text">Devoluciones</p>
              <div className="divide-y divide-border">
                {sale.returns.map((ret) => (
                  <div key={ret._id} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <div>
                      <p className="text-text">
                        {ret.items.map((i) => `${i.quantity} × ${i.variantSku}`).join(", ")}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatDateTime(ret.createdAt)} · {PAYMENT_METHOD_LABELS[ret.refundMethod]}
                        {ret.reason && ` · ${ret.reason}`}
                      </p>
                    </div>
                    <span className="tabular-nums text-text">-{formatMoney(ret.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {canReturn && (
            <Card>
              <p className="mb-4 font-display text-lg text-text">Registrar devolución</p>
              <StoreSaleReturnForm sale={sale} onReturned={setSale} />
            </Card>
          )}
          {(sale.status === "completed" || sale.status === "partially_returned") && !session && (
            <InlineMessage tone="error">
              Para registrar devoluciones o anulaciones primero abrí la caja.
            </InlineMessage>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {sale.status !== "voided" && (
            <Card className="flex flex-col gap-4">
              <p className="font-display text-lg text-text">Ticket</p>
              <a href={`/admin/ventas/${sale._id}/ticket`} target="_blank" rel="noopener noreferrer" className="self-start">
                <Button type="button" variant="secondary">
                  <Printer className="size-4" /> Imprimir
                </Button>
              </a>
              <SendReceiptForm sale={sale} onSent={setSale} />
            </Card>
          )}

          {canVoid && (
            <Card className="flex flex-col gap-3">
              <p className="font-display text-lg text-text">Anular venta</p>
              {showVoid ? (
                <form onSubmit={handleVoid} className="flex flex-col gap-3">
                  <Input
                    label="Motivo"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    required
                    maxLength={300}
                  />
                  {voidError && <InlineMessage tone="error">{voidError}</InlineMessage>}
                  <div className="flex gap-2">
                    <Button type="submit" variant="danger" isLoading={isVoiding}>
                      Anular
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowVoid(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="text-sm text-text-muted">
                    Disponible mientras la caja siga abierta. Repone el stock y la venta deja de sumar en el arqueo.
                  </p>
                  <Button type="button" variant="secondary" className="self-start" onClick={() => setShowVoid(true)}>
                    Anular venta
                  </Button>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
