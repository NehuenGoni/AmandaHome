import { STORE_PAYMENT_METHODS, formatMoney, type StorePaymentMethod, type StoreSale } from "@amanda/shared";
import { Percent, ShoppingBasket, Trash2 } from "lucide-react";
import { useState, type Dispatch, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { ApiError } from "@/lib/apiClient";
import type { PosCartAction, PosCartState, PosCartTotals } from "@/lib/posCart";
import { PAYMENT_METHOD_LABELS } from "@/lib/storeSaleLabels";
import { createStoreSale } from "@/lib/storeSalesApi";
import { cn } from "@/lib/utils";
import { DiscountInput } from "./DiscountInput";

interface PosCartPanelProps {
  cart: PosCartState;
  totals: PosCartTotals;
  dispatch: Dispatch<PosCartAction>;
  onSold: (sale: StoreSale) => void;
}

export function PosCartPanel({ cart, totals, dispatch, onSold }: PosCartPanelProps) {
  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [paymentReference, setPaymentReference] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [openDiscounts, setOpenDiscounts] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCash = paymentMethod === "cash";
  const change = cashReceived - totals.total;
  const canCharge = cart.lines.length > 0 && totals.total > 0 && (!isCash || cashReceived >= totals.total);

  function toggleDiscount(sku: string) {
    setOpenDiscounts((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) {
        next.delete(sku);
        dispatch({ type: "setLineDiscount", variantSku: sku, discount: undefined });
      } else {
        next.add(sku);
      }
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canCharge) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { sale } = await createStoreSale({
        items: cart.lines.map((line) => ({
          productId: line.productId,
          variantSku: line.variantSku,
          quantity: line.quantity,
          discount: line.discount,
        })),
        discount: cart.discount,
        paymentMethod,
        cashReceived: isCash ? cashReceived : undefined,
        paymentReference: !isCash && paymentReference.trim() ? paymentReference.trim() : undefined,
        customer: {
          name: customerName.trim() || undefined,
          email: customerEmail.trim() || undefined,
        },
      });
      dispatch({ type: "clear" });
      setOpenDiscounts(new Set());
      setCashReceived(0);
      setPaymentReference("");
      setCustomerName("");
      setCustomerEmail("");
      onSold(sale);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos registrar la venta");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBasket}
        title="La venta está vacía"
        description="Escaneá un producto o buscalo por nombre para empezar."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {cart.lines.map((line) => {
          const lineTotals = totals.lines[line.variantSku];
          const discountOpen = openDiscounts.has(line.variantSku) || Boolean(line.discount);
          return (
            <div key={line.variantSku} className="flex flex-col gap-3 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{line.productName}</p>
                  <p className="text-xs text-text-muted">
                    {line.attributeName}: {line.attributeValue} · {formatMoney(line.unitPrice)} c/u
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Quitar ${line.productName}`}
                  onClick={() => dispatch({ type: "remove", variantSku: line.variantSku })}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <QuantityStepper
                  size="sm"
                  value={line.quantity}
                  max={line.stock}
                  onChange={(quantity) => dispatch({ type: "setQuantity", variantSku: line.variantSku, quantity })}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleDiscount(line.variantSku)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors",
                      discountOpen ? "bg-accent/15 text-accent-deep" : "text-text-muted hover:bg-surface-alt",
                    )}
                  >
                    <Percent className="size-3" /> Descuento
                  </button>
                  <div className="text-right">
                    {lineTotals && lineTotals.discount > 0 && (
                      <p className="text-xs tabular-nums text-text-muted line-through">
                        {formatMoney(lineTotals.gross)}
                      </p>
                    )}
                    <p className="text-sm font-medium tabular-nums text-text">
                      {formatMoney(lineTotals?.subtotal ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
              {discountOpen && (
                <DiscountInput
                  value={line.discount}
                  onChange={(discount) => dispatch({ type: "setLineDiscount", variantSku: line.variantSku, discount })}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text">Descuento sobre el total</p>
        <DiscountInput value={cart.discount} onChange={(discount) => dispatch({ type: "setDiscount", discount })} />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border pt-4 text-sm">
        <div className="flex justify-between text-text-muted">
          <span>Subtotal ({totals.units} u.)</span>
          <span className="tabular-nums">{formatMoney(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-text-muted">
            <span>Descuento</span>
            <span className="tabular-nums">-{formatMoney(totals.discount)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="font-medium text-text">Total</span>
          <span className="font-display text-2xl tabular-nums text-text">{formatMoney(totals.total)}</span>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-text">Medio de pago</legend>
        <div className="grid grid-cols-2 gap-2">
          {STORE_PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              aria-pressed={paymentMethod === method}
              onClick={() => setPaymentMethod(method)}
              className={cn(
                "h-11 rounded-xl border text-sm font-medium transition-colors",
                paymentMethod === method
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border bg-surface text-text hover:bg-surface-alt",
              )}
            >
              {PAYMENT_METHOD_LABELS[method]}
            </button>
          ))}
        </div>
      </fieldset>

      {isCash ? (
        <div className="flex flex-col gap-2">
          <MoneyInput label="Efectivo recibido" value={cashReceived} onChange={setCashReceived} />
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCashReceived(totals.total)}
              className="rounded-full bg-surface-alt px-3 py-1 text-xs text-text hover:bg-border"
            >
              Monto exacto
            </button>
            <p className="text-sm">
              {change >= 0 ? (
                <>
                  Vuelto: <span className="font-medium tabular-nums text-support">{formatMoney(change)}</span>
                </>
              ) : (
                <span className="text-accent2-deep">Faltan {formatMoney(-change)}</span>
              )}
            </p>
          </div>
        </div>
      ) : (
        <Input
          label="Referencia (opcional)"
          placeholder="Nº de cupón o de transferencia"
          value={paymentReference}
          onChange={(e) => setPaymentReference(e.target.value)}
          maxLength={100}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Cliente (opcional)"
          placeholder="Consumidor final"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          maxLength={100}
        />
        <Input
          label="Email para el ticket"
          type="email"
          placeholder="Opcional"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
        />
      </div>

      {error && <InlineMessage tone="error">{error}</InlineMessage>}

      <div className="flex gap-3">
        <Button type="submit" size="lg" className="flex-1" isLoading={isSubmitting} disabled={!canCharge}>
          Cobrar {formatMoney(totals.total)}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => dispatch({ type: "clear" })}>
          Vaciar
        </Button>
      </div>
    </form>
  );
}
