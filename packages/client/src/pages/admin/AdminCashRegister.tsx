import { formatMoney } from "@amanda/shared";
import { Landmark, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { CashMovementForm } from "@/components/admin/pos/CashMovementForm";
import { CashSessionSummary } from "@/components/admin/pos/CashSessionSummary";
import { CloseCashSessionForm } from "@/components/admin/pos/CloseCashSessionForm";
import { OpenCashSessionForm } from "@/components/admin/pos/OpenCashSessionForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useCashSessions } from "@/hooks/admin/useCashSessions";
import { useCurrentCashSession } from "@/hooks/admin/useCurrentCashSession";
import { formatDateTime } from "@/lib/storeSaleLabels";

export default function AdminCashRegister() {
  const [page, setPage] = useState(1);
  const { session, setSession, isLoading, error } = useCurrentCashSession();
  const { data: history, isLoading: loadingHistory, reload: reloadHistory } = useCashSessions(page);

  // Las cajas cerradas y la actual no se mezclan: la abierta se muestra arriba, con sus acciones.
  const closedSessions = history?.items.filter((s) => s.status === "closed") ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-text">Caja</h1>
        {session && (
          <Link to="/admin/ventas">
            <Button>
              <ShoppingBag className="size-4" /> Ir a vender
            </Button>
          </Link>
        )}
      </div>

      {error && <InlineMessage tone="error">{error}</InlineMessage>}

      {isLoading ? (
        <Spinner />
      ) : session ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-display text-lg text-text">Caja abierta</p>
              <Badge tone="support">Desde {formatDateTime(session.openedAt)}</Badge>
            </div>
            <CashSessionSummary session={session} />
            {session.movements.length > 0 && (
              <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
                <p className="text-sm font-medium text-text">Movimientos manuales</p>
                {session.movements.map((movement) => (
                  <div key={movement._id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-muted">
                      {movement.reason} · {formatDateTime(movement.createdAt)}
                    </span>
                    <span className="tabular-nums text-text">
                      {movement.type === "in" ? "+" : "-"}
                      {formatMoney(movement.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <p className="mb-4 font-display text-lg text-text">Ingreso / egreso de efectivo</p>
              <CashMovementForm onAdded={setSession} />
            </Card>
            <Card>
              <p className="mb-4 font-display text-lg text-text">Cerrar caja</p>
              <CloseCashSessionForm
                session={session}
                onClosed={() => {
                  setSession(null);
                  reloadHistory();
                }}
              />
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <p className="mb-1 font-display text-lg text-text">No hay una caja abierta</p>
          <p className="mb-4 text-sm text-text-muted">
            Abrí la caja con el efectivo inicial para poder registrar ventas en el local.
          </p>
          <OpenCashSessionForm
            onOpened={(opened) => {
              setSession(opened);
              reloadHistory();
            }}
          />
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-text">Historial de cajas</h2>
        {loadingHistory ? (
          <Spinner />
        ) : closedSessions.length > 0 ? (
          <>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {closedSessions.map((closed) => (
                <details key={closed._id} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text">
                        {formatDateTime(closed.openedAt)} → {closed.closedAt ? formatDateTime(closed.closedAt) : ""}
                      </p>
                      <p className="text-xs text-text-muted">
                        {closed.totals.salesCount} venta{closed.totals.salesCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge tone={closed.difference === 0 ? "support" : "warning"}>
                      {closed.difference === 0
                        ? "Cuadró"
                        : `${(closed.difference ?? 0) < 0 ? "Faltante" : "Sobrante"} ${formatMoney(Math.abs(closed.difference ?? 0))}`}
                    </Badge>
                  </summary>
                  <div className="mt-3">
                    <CashSessionSummary session={closed} />
                    {closed.notes && <p className="mt-2 text-sm text-text-muted">Obs.: {closed.notes}</p>}
                  </div>
                </details>
              ))}
            </div>
            {history && <Pagination page={history.page} totalPages={history.totalPages} onChange={setPage} />}
          </>
        ) : (
          <EmptyState icon={Landmark} title="Todavía no cerraste ninguna caja" />
        )}
      </div>
    </div>
  );
}
