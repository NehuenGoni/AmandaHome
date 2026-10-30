import type { StoreSale } from "@amanda/shared";
import { Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/apiClient";
import { emailStoreSale } from "@/lib/storeSalesApi";

interface SendReceiptFormProps {
  sale: StoreSale;
  onSent: (sale: StoreSale) => void;
}

export function SendReceiptForm({ sale, onSent }: SendReceiptFormProps) {
  const [email, setEmail] = useState(sale.customer?.email ?? "");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSending(true);
    setError(null);
    setJustSent(null);
    try {
      const { sale: updated } = await emailStoreSale(sale._id, email.trim());
      setJustSent(email.trim());
      onSent(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos enviar el ticket");
    } finally {
      setIsSending(false);
    }
  }

  const alreadySentTo = sale.emailSentTo.filter((address) => address !== justSent);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Input
            type="email"
            aria-label="Email para enviar el ticket"
            placeholder="cliente@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="secondary" isLoading={isSending}>
          <Mail className="size-4" /> Enviar
        </Button>
      </div>
      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      {justSent && <InlineMessage tone="success">Ticket enviado a {justSent}.</InlineMessage>}
      {alreadySentTo.length > 0 && (
        <p className="text-xs text-text-muted">Enviado antes a: {alreadySentTo.join(", ")}</p>
      )}
    </form>
  );
}
