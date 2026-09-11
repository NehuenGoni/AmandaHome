import type { Order, OrderStatus } from "@amanda/shared";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ApiError } from "@/lib/apiClient";
import type { UpdateOrderStatusInput } from "@/lib/adminOrdersApi";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pendiente de pago" },
  { value: "confirmed", label: "Confirmado" },
  { value: "preparing", label: "En preparación" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregado" },
  { value: "cancelled", label: "Cancelado" },
];

interface OrderStatusFormProps {
  order: Order;
  onSubmit: (input: UpdateOrderStatusInput) => Promise<void>;
}

export function OrderStatusForm({ order, onSubmit }: OrderStatusFormProps) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await onSubmit({ status, trackingNumber: trackingNumber || undefined, note: note || undefined });
      setNote("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos actualizar el pedido");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Input
        label="Número de seguimiento (opcional)"
        value={trackingNumber}
        onChange={(e) => setTrackingNumber(e.target.value)}
      />
      <Textarea label="Nota interna (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />

      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      {success && <InlineMessage tone="success">Pedido actualizado.</InlineMessage>}

      <div>
        <Button type="submit" isLoading={isSubmitting}>
          Actualizar pedido
        </Button>
      </div>
    </form>
  );
}
