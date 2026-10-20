import { BUSINESS, type WithdrawalReceipt } from "@amanda/shared";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Textarea } from "@/components/ui/Textarea";
import { ApiError } from "@/lib/apiClient";
import { createWithdrawal } from "@/lib/withdrawalApi";

export default function Arrepentimiento() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<WithdrawalReceipt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await createWithdrawal({
        orderNumber: Number(orderNumber),
        email,
        fullName,
        reason: reason.trim() || undefined,
      });
      setReceipt(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ocurrió un error, intentá de nuevo");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl py-6">
      <h1 className="font-display text-3xl text-text">Botón de arrepentimiento</h1>
      <p className="mt-2 text-sm text-text-muted">
        Tenés {BUSINESS.withdrawalDays} días corridos desde que recibís tu compra para arrepentirte y revocar la
        aceptación, sin costo (Ley 24.240, art. 34). Completá el formulario y te enviamos la constancia por email.{" "}
        <Link to="/cambios-y-devoluciones" className="font-medium text-accent-deep hover:underline">
          Ver política de cambios y devoluciones
        </Link>
        .
      </p>

      {receipt ? (
        <div className="mt-6">
          <InlineMessage tone="success">
            Recibimos tu solicitud. Nº de trámite: <strong>{receipt.requestNumber}</strong> —{" "}
            {new Date(receipt.createdAt).toLocaleString("es-AR")}. Te enviamos la constancia a {email} y nos vamos a
            contactar para coordinar la devolución.
          </InlineMessage>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4 rounded-3xl border border-border bg-surface p-6"
        >
          <Input
            label="Número de pedido"
            type="number"
            inputMode="numeric"
            min={1}
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
          <Input
            label="Email con el que compraste"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Nombre y apellido"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Textarea
            label="Motivo (opcional)"
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {error && <InlineMessage tone="error">{error}</InlineMessage>}
          <Button type="submit" size="lg" isLoading={isSubmitting}>
            Solicitar arrepentimiento
          </Button>
        </form>
      )}
    </div>
  );
}
