import type { CashMovementType, CashSession } from "@amanda/shared";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Select } from "@/components/ui/Select";
import { ApiError } from "@/lib/apiClient";
import { addCashMovement } from "@/lib/cashSessionsApi";

export function CashMovementForm({ onAdded }: { onAdded: (session: CashSession) => void }) {
  const [type, setType] = useState<CashMovementType>("out");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      setError("Ingresá un monto mayor a 0");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { session } = await addCashMovement({ type, amount, reason: reason.trim() });
      setAmount(0);
      setReason("");
      onAdded(session);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos registrar el movimiento");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value as CashMovementType)}>
          <option value="out">Egreso (retiro, gasto)</option>
          <option value="in">Ingreso (cambio, aporte)</option>
        </Select>
        <MoneyInput label="Monto" value={amount} onChange={setAmount} />
      </div>
      <Input
        label="Motivo"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Ej: compra de bolsas, cambio para la caja"
        required
        maxLength={200}
      />
      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      <Button type="submit" variant="secondary" isLoading={isSubmitting} className="self-start">
        Registrar movimiento
      </Button>
    </form>
  );
}
