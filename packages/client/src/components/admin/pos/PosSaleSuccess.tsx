import { formatMoney, type StoreSale } from "@amanda/shared";
import { CheckCircle2, Plus, Printer } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PAYMENT_METHOD_LABELS } from "@/lib/storeSaleLabels";
import { SendReceiptForm } from "./SendReceiptForm";

interface PosSaleSuccessProps {
  sale: StoreSale;
  onNewSale: () => void;
}

export function PosSaleSuccess({ sale: initialSale, onNewSale }: PosSaleSuccessProps) {
  const [sale, setSale] = useState(initialSale);

  return (
    <Card className="mx-auto flex max-w-lg flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-support/15 text-support">
          <CheckCircle2 className="size-6" />
        </div>
        <div>
          <p className="font-display text-xl text-text">Venta #{sale.saleNumber} registrada</p>
          <p className="text-sm text-text-muted">{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 rounded-xl bg-surface-alt px-4 py-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Total cobrado</span>
          <span className="font-medium tabular-nums text-text">{formatMoney(sale.total)}</span>
        </div>
        {sale.paymentMethod === "cash" && (
          <>
            <div className="flex justify-between">
              <span className="text-text-muted">Recibido</span>
              <span className="tabular-nums text-text">{formatMoney(sale.cashReceived ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-text">Vuelto a entregar</span>
              <span className="font-display text-xl tabular-nums text-support">{formatMoney(sale.change ?? 0)}</span>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-text">Ticket</p>
        <a href={`/admin/ventas/${sale._id}/ticket`} target="_blank" rel="noopener noreferrer" className="self-start">
          <Button type="button" variant="secondary">
            <Printer className="size-4" /> Imprimir ticket
          </Button>
        </a>
        <SendReceiptForm sale={sale} onSent={setSale} />
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        <Button type="button" onClick={onNewSale}>
          <Plus className="size-4" /> Nueva venta
        </Button>
        <Link to={`/admin/ventas/${sale._id}`}>
          <Button type="button" variant="ghost">
            Ver detalle
          </Button>
        </Link>
      </div>
    </Card>
  );
}
