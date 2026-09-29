import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { OrderSummaryCard } from "@/components/orders/OrderSummaryCard";
import { PayNowButton } from "@/components/orders/PayNowButton";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useMyOrder } from "@/hooks/useMyOrder";
import { getMyOrder } from "@/lib/ordersApi";
import NotFound from "./NotFound";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 30000;

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const failureOrPending = searchParams.get("status");
  const { order, isLoading, error } = useMyOrder(id);
  const [liveOrder, setLiveOrder] = useState(order);
  const pollStart = useRef(Date.now());

  useEffect(() => {
    setLiveOrder(order);
    pollStart.current = Date.now();
  }, [order]);

  // El webhook de Mercado Pago puede tardar unos segundos: mientras el
  // pedido siga pending, reconsultamos hasta que se confirme o pase el tiempo.
  useEffect(() => {
    if (!id || !liveOrder || liveOrder.status !== "pending") return;
    if (Date.now() - pollStart.current > POLL_TIMEOUT_MS) return;

    const timeout = setTimeout(() => {
      getMyOrder(id)
        .then((result) => setLiveOrder(result.order))
        .catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timeout);
  }, [id, liveOrder]);

  if (isLoading) return <Spinner label="Buscando tu pedido…" />;
  if (error || !liveOrder) return <NotFound />;

  const isConfirmed = liveOrder.status !== "pending" && liveOrder.status !== "cancelled";
  const isCancelled = liveOrder.status === "cancelled";
  // Mercado Pago redirige de vuelta con esto cuando la tarjeta se rechazó o el pago quedó pendiente:
  // el pedido sigue "pending" (se puede reintentar), a diferencia de un pedido ya cancelado.
  const paymentDidNotComplete =
    isCancelled || (liveOrder.status === "pending" && (failureOrPending === "failure" || failureOrPending === "pending"));

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15, stiffness: 200 }}
        className="flex size-16 items-center justify-center rounded-full"
      >
        {paymentDidNotComplete ? (
          <XCircle className="size-16 text-accent2" />
        ) : isConfirmed ? (
          <CheckCircle2 className="size-16 text-support" />
        ) : (
          <Clock className="size-16 text-accent-deep" />
        )}
      </motion.div>

      <div>
        <h1 className="font-display text-2xl text-text">
          {paymentDidNotComplete ? "El pago no se completó" : isConfirmed ? "¡Gracias por tu compra!" : "Estamos confirmando tu pago"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {paymentDidNotComplete
            ? isCancelled
              ? "El pedido se canceló. Si querés, podés hacer una compra nueva."
              : "Podés intentar el pago de nuevo cuando quieras."
            : isConfirmed
              ? "Te enviamos un email con los detalles de tu pedido."
              : "Esto puede tardar unos segundos, no cierres esta página."}
        </p>
        {paymentDidNotComplete && !isCancelled && (
          <div className="mt-4 flex justify-center">
            <PayNowButton orderId={liveOrder._id} />
          </div>
        )}
      </div>

      <div className="w-full text-left">
        <OrderSummaryCard order={liveOrder} />
      </div>

      <div className="flex gap-3">
        <Link to="/cuenta/pedidos">
          <Button variant="secondary">Ver mis pedidos</Button>
        </Link>
        <Link to="/catalogo">
          <Button variant="ghost">Seguir comprando</Button>
        </Link>
      </div>
    </div>
  );
}
