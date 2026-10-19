import type { CashSession } from "@amanda/shared";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { ApiError } from "@/lib/apiClient";
import { openCashSession } from "@/lib/cashSessionsApi";

export function OpenCashSessionForm({ onOpened }: { onOpened: (session: CashSession) => void }) {
  const [openingAmount, setOpeningAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const { session } = await openCashSession(openingAmount);
      onOpened(session);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos abrir la caja");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <MoneyInput label="Efectivo inicial en la caja" value={openingAmount} onChange={setOpeningAmount} />
      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      <Button type="submit" isLoading={isSubmitting}>
        Abrir caja
      </Button>
    </form>
  );
}
