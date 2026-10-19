import { STORE_PAYMENT_METHODS, formatMoney, type CashSession } from "@amanda/shared";
import { PAYMENT_METHOD_LABELS } from "@/lib/storeSaleLabels";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className={strong ? "font-medium text-text" : "text-text-muted"}>{label}</span>
      <span className={strong ? "font-medium tabular-nums text-text" : "tabular-nums text-text"}>{value}</span>
    </div>
  );
}

/** Resumen de una caja (abierta: en vivo; cerrada: el snapshot guardado al cerrar). */
export function CashSessionSummary({ session }: { session: CashSession }) {
  const { totals } = session;
  return (
    <div className="divide-y divide-border">
      <Row label="Efectivo inicial" value={formatMoney(session.openingAmount)} />
      {STORE_PAYMENT_METHODS.map((method) => (
        <Row
          key={method}
          label={`Ventas · ${PAYMENT_METHOD_LABELS[method]}`}
          value={formatMoney(totals.salesByMethod[method])}
        />
      ))}
      {STORE_PAYMENT_METHODS.filter((m) => totals.refundsByMethod[m] > 0).map((method) => (
        <Row
          key={`refund-${method}`}
          label={`Devoluciones · ${PAYMENT_METHOD_LABELS[method]}`}
          value={`-${formatMoney(totals.refundsByMethod[method])}`}
        />
      ))}
      <Row label="Ingresos de efectivo" value={formatMoney(totals.cashIn)} />
      <Row label="Egresos de efectivo" value={`-${formatMoney(totals.cashOut)}`} />
      <Row label="Efectivo esperado en caja" value={formatMoney(totals.expectedCash)} strong />
      {session.status === "closed" && session.countedCash !== undefined && (
        <>
          <Row label="Efectivo contado" value={formatMoney(session.countedCash)} />
          <Row
            label={(session.difference ?? 0) < 0 ? "Faltante" : (session.difference ?? 0) > 0 ? "Sobrante" : "Diferencia"}
            value={formatMoney(session.difference ?? 0)}
            strong
          />
        </>
      )}
    </div>
  );
}
