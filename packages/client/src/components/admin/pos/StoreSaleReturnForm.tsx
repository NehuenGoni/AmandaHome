import { STORE_PAYMENT_METHODS, formatMoney, type StorePaymentMethod, type StoreSale } from "@amanda/shared";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Input } from "@/components/ui/Input";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Select } from "@/components/ui/Select";
import { ApiError } from "@/lib/apiClient";
import { PAYMENT_METHOD_LABELS } from "@/lib/storeSaleLabels";
import { returnStoreSaleItems } from "@/lib/storeSalesApi";

interface StoreSaleReturnFormProps {
  sale: StoreSale;
  onReturned: (sale: StoreSale) => void;
}

export function StoreSaleReturnForm({ sale, onReturned }: StoreSaleReturnFormProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<StorePaymentMethod>(sale.paymentMethod);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = useMemo(() => {
    const returned = new Map<string, number>();
    for (const ret of sale.returns) {
      for (const item of ret.items) {
        returned.set(item.variantSku, (returned.get(item.variantSku) ?? 0) + item.quantity);
      }
    }
    return new Map(sale.items.map((item) => [item.variantSku, item.quantity - (returned.get(item.variantSku) ?? 0)]));
  }, [sale]);

  // Estimación: el descuento global se prorratea entre las líneas. El monto final lo fija el servidor.
  const ratio = sale.subtotal > 0 ? sale.total / sale.subtotal : 1;
  const estimate = sale.items.reduce((sum, item) => {
    const qty = quantities[item.variantSku] ?? 0;
    return sum + Math.round((item.subtotal * ratio * qty) / item.quantity);
  }, 0);
  const selected = Object.entries(quantities).filter(([, qty]) => qty > 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (selected.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { sale: updated } = await returnStoreSaleItems(sale._id, {
        items: selected.map(([variantSku, quantity]) => ({ variantSku, quantity })),
        refundMethod,
        reason: reason.trim() || undefined,
      });
      setQuantities({});
      setReason("");
      onReturned(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos registrar la devolución");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="divide-y divide-border rounded-xl border border-border">
        {sale.items.map((item) => {
          const left = remaining.get(item.variantSku) ?? 0;
          return (
            <div key={item.variantSku} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{item.productName}</p>
                <p className="text-xs text-text-muted">
                  {item.attributeValue} · {left > 0 ? `se pueden devolver ${left}` : "ya devuelto"}
                </p>
              </div>
              {left > 0 && (
                <QuantityStepper
                  size="sm"
                  min={0}
                  max={left}
                  value={quantities[item.variantSku] ?? 0}
                  onChange={(qty) => setQuantities((prev) => ({ ...prev, [item.variantSku]: qty }))}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Reintegrar por"
          value={refundMethod}
          onChange={(e) => setRefundMethod(e.target.value as StorePaymentMethod)}
        >
          {STORE_PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </Select>
        <Input
          label="Motivo (opcional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
        />
      </div>

      <p className="text-sm text-text-muted">
        Reintegro estimado: <span className="font-medium tabular-nums text-text">{formatMoney(estimate)}</span>
        {refundMethod === "cash" && " · sale del efectivo de la caja abierta"}
      </p>

      {error && <InlineMessage tone="error">{error}</InlineMessage>}

      <Button type="submit" variant="secondary" className="self-start" isLoading={isSubmitting} disabled={selected.length === 0}>
        Registrar devolución
      </Button>
    </form>
  );
}
