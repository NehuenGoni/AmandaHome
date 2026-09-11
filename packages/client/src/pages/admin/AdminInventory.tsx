import type { StockMovementType } from "@amanda/shared";
import { AlertTriangle, History } from "lucide-react";
import { StockAdjustmentForm } from "@/components/admin/StockAdjustmentForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useLowStock } from "@/hooks/admin/useLowStock";
import { useStockMovements } from "@/hooks/admin/useStockMovements";

const MOVEMENT_LABEL: Record<StockMovementType, string> = {
  purchase_in: "Ingreso por compra",
  sale_out: "Salida por venta",
  adjustment: "Ajuste manual",
  return: "Devolución",
};

const MOVEMENT_TONE: Record<StockMovementType, "neutral" | "accent" | "support" | "warning"> = {
  purchase_in: "support",
  sale_out: "neutral",
  adjustment: "warning",
  return: "accent",
};

export default function AdminInventory() {
  const { items: lowStock, isLoading: loadingLowStock, reload: reloadLowStock } = useLowStock();
  const { data: movements, isLoading: loadingMovements, reload: reloadMovements } = useStockMovements({ limit: 15 });

  function handleAdjusted() {
    reloadLowStock();
    reloadMovements();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text">Inventario</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-text">Stock bajo</h2>
          {loadingLowStock ? (
            <Spinner />
          ) : lowStock.length > 0 ? (
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {lowStock.map((item) => (
                <div key={`${item.productId}-${item.variantSku}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-text">{item.productName}</p>
                    <p className="text-xs text-text-muted">
                      {item.attributeName}: {item.attributeValue} · SKU {item.variantSku}
                    </p>
                  </div>
                  <Badge tone="warning">{item.stock} en stock</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={AlertTriangle} title="Todo el stock está en orden" />
          )}
        </div>

        <Card>
          <p className="mb-4 font-display text-lg text-text">Ajustar stock</p>
          <StockAdjustmentForm onAdjusted={handleAdjusted} />
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-text">Movimientos recientes</h2>
        {loadingMovements ? (
          <Spinner />
        ) : movements && movements.items.length > 0 ? (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {movements.items.map((movement) => (
              <div key={movement._id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-text">SKU {movement.variantSku}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(movement.createdAt).toLocaleString("es-AR")}
                    {movement.note ? ` · ${movement.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums text-text">
                    {movement.previousStock} → {movement.newStock}
                  </span>
                  <Badge tone={MOVEMENT_TONE[movement.type]}>{MOVEMENT_LABEL[movement.type]}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={History} title="Todavía no hay movimientos registrados" />
        )}
      </div>
    </div>
  );
}
