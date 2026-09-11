import type { OrderStatus } from "@amanda/shared";
import { Badge } from "@/components/ui/Badge";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pendiente de pago",
  confirmed: "Confirmado",
  preparing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_TONE: Record<OrderStatus, "neutral" | "accent" | "support" | "warning" | "danger"> = {
  pending: "warning",
  confirmed: "accent",
  preparing: "accent",
  shipped: "support",
  delivered: "support",
  cancelled: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
