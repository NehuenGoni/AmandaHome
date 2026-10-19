import { formatMoney, type CashSession } from "@amanda/shared";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Textarea } from "@/components/ui/Textarea";
import { ApiError } from "@/lib/apiClient";
import { closeCashSession } from "@/lib/cashSessionsApi";

interface CloseCashSessionFormProps {
  session: CashSession;
  onClosed: (session: CashSession) => void;
}

export function CloseCashSessionForm({ session, onClosed }: CloseCashSessionFormProps) {
  const [countedCash, setCountedCash] = useState(session.totals.expectedCash);
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const difference = countedCash - session.totals.expectedCash;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setConfirming(true);
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    try {
      const { session: closed } = await closeCashSession({
        countedCash,
        notes: notes.trim() || undefined,
      });
      setConfirming(false);
      onClosed(closed);
    } catch (err) {
      setConfirming(false);
      setError(err instanceof ApiError ? err.message : "No pudimos cerrar la caja");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <MoneyInput label="Efectivo contado" value={countedCash} onChange={setCountedCash} />
      <p className="text-sm text-text-muted">
        Esperado: <span className="font-medium text-text">{formatMoney(session.totals.expectedCash)}</span> ·{" "}
        {difference === 0 ? (
          <span className="text-support">la caja cuadra</span>
        ) : (
          <span className="text-accent2-deep">
            {difference < 0 ? "faltan" : "sobran"} {formatMoney(Math.abs(difference))}
          </span>
        )}
      </p>
      <Textarea
        label="Observaciones"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={500}
        rows={2}
      />
      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      <Button type="submit" variant="danger" className="self-start">
        Cerrar caja
      </Button>

      <ConfirmDialog
        open={confirming}
        title="¿Cerrar la caja?"
        description="Una vez cerrada no se pueden registrar más ventas hasta abrir una nueva."
        confirmLabel="Cerrar caja"
        tone="danger"
        isLoading={isSubmitting}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </form>
  );
}
