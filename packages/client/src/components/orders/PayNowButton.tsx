import { CreditCard } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { ApiError } from "@/lib/apiClient";
import { payMyOrder } from "@/lib/ordersApi";

/** Reintento de pago (1b): reusa el link guardado o le pide al server que cree uno nuevo. */
export function PayNowButton({ orderId }: { orderId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);
    try {
      const { checkoutUrl } = await payMyOrder(orderId);
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos iniciar el pago");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={handleClick} isLoading={isLoading} className="w-fit">
        <CreditCard className="size-4" /> Pagar ahora
      </Button>
      {error && <InlineMessage tone="error">{error}</InlineMessage>}
    </div>
  );
}
