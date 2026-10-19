import type { StoreSale } from "@amanda/shared";
import { History, Landmark } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PosCartPanel } from "@/components/admin/pos/PosCartPanel";
import { PosProductSearch } from "@/components/admin/pos/PosProductSearch";
import { PosSaleSuccess } from "@/components/admin/pos/PosSaleSuccess";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Spinner } from "@/components/ui/Spinner";
import { useCurrentCashSession } from "@/hooks/admin/useCurrentCashSession";
import { usePosCart } from "@/hooks/admin/usePosCart";

export default function AdminPos() {
  const { session, isLoading, error } = useCurrentCashSession();
  const { state, totals, dispatch } = usePosCart();
  const [lastSale, setLastSale] = useState<StoreSale | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-text">Punto de venta</h1>
        <Link to="/admin/ventas/historial">
          <Button variant="secondary">
            <History className="size-4" /> Ventas del local
          </Button>
        </Link>
      </div>

      {error && <InlineMessage tone="error">{error}</InlineMessage>}

      {isLoading ? (
        <Spinner />
      ) : !session ? (
        <EmptyState
          icon={Landmark}
          title="Abrí la caja para empezar a vender"
          description="Las ventas del local se registran sobre una caja abierta, así el arqueo al cierre siempre cuadra."
          action={
            <Link to="/admin/caja">
              <Button>Ir a Caja</Button>
            </Link>
          }
        />
      ) : lastSale ? (
        <PosSaleSuccess sale={lastSale} onNewSale={() => setLastSale(null)} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_420px]">
          <PosProductSearch onSelect={(product) => dispatch({ type: "add", product })} />
          <Card className="lg:sticky lg:top-6">
            <PosCartPanel cart={state} totals={totals} dispatch={dispatch} onSold={setLastSale} />
          </Card>
        </div>
      )}
    </div>
  );
}
