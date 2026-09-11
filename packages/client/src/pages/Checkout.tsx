import { formatMoney } from "@amanda/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { AddressForm } from "@/components/account/AddressForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { PriceTag } from "@/components/ui/PriceTag";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { ApiError } from "@/lib/apiClient";
import { createCheckout } from "@/lib/checkoutApi";
import { addAddress, type AddressInput } from "@/lib/usersApi";
import { cn } from "@/lib/utils";

// Deben coincidir con SHIPPING_COSTS en packages/server/src/services/checkoutService.ts
const SHIPPING_OPTIONS = [
  { value: "pickup", label: "Retiro en el local", cost: 0 },
  { value: "standard", label: "Envío estándar (3-5 días hábiles)", cost: 150000 },
  { value: "express", label: "Envío express (24-48hs)", cost: 300000 },
] as const;

export default function Checkout() {
  const { user, setUser } = useAuth();
  const { cart } = useCart();
  const [addressId, setAddressId] = useState(user?.addresses.find((a) => a.isDefault)?._id ?? "");
  const [showAddressForm, setShowAddressForm] = useState(user?.addresses.length === 0);
  const [shippingMethod, setShippingMethod] = useState<(typeof SHIPPING_OPTIONS)[number]["value"]>("standard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cart.items.length === 0) return <Navigate to="/carrito" replace />;

  const shippingCost = SHIPPING_OPTIONS.find((o) => o.value === shippingMethod)?.cost ?? 0;
  const total = cart.subtotal + shippingCost;

  async function handleAddAddress(input: AddressInput) {
    const result = await addAddress(input);
    setUser(result.user);
    const newAddress = result.user.addresses[result.user.addresses.length - 1];
    if (newAddress) setAddressId(newAddress._id);
    setShowAddressForm(false);
  }

  async function handleConfirm() {
    if (!addressId) {
      setError("Elegí una dirección de envío");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { checkoutUrl } = await createCheckout({ addressId, shippingMethod });
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos iniciar el pago");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-text">Dirección de envío</h2>
            {!showAddressForm && (
              <button
                type="button"
                onClick={() => setShowAddressForm(true)}
                className="flex items-center gap-1 text-sm font-medium text-accent-deep hover:underline"
              >
                <Plus className="size-4" /> Nueva dirección
              </button>
            )}
          </div>

          {showAddressForm ? (
            <Card>
              <AddressForm
                onSubmit={handleAddAddress}
                onCancel={user && user.addresses.length > 0 ? () => setShowAddressForm(false) : undefined}
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {user?.addresses.map((address) => (
                <label
                  key={address._id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                    addressId === address._id ? "border-accent bg-accent/5" : "border-border bg-surface",
                  )}
                >
                  <input
                    type="radio"
                    name="address"
                    className="mt-1"
                    checked={addressId === address._id}
                    onChange={() => setAddressId(address._id)}
                  />
                  <div className="text-sm">
                    {address.label && <p className="font-medium text-text">{address.label}</p>}
                    <p className="text-text-muted">
                      {address.street} {address.number}, {address.city}, {address.province} ({address.postalCode})
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-text">Método de envío</h2>
          <div className="flex flex-col gap-2">
            {SHIPPING_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-colors",
                  shippingMethod === option.value ? "border-accent bg-accent/5" : "border-border bg-surface",
                )}
              >
                <span className="flex items-center gap-3 text-sm">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === option.value}
                    onChange={() => setShippingMethod(option.value)}
                  />
                  {option.label}
                </span>
                <span className="text-sm font-medium text-text">
                  {option.cost === 0 ? "Gratis" : formatMoney(option.cost)}
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <Card className="h-fit">
        <h2 className="font-display text-lg text-text">Resumen</h2>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Subtotal</span>
            <span>{formatMoney(cart.subtotal)}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Envío</span>
            <span>{shippingCost === 0 ? "Gratis" : formatMoney(shippingCost)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-medium text-text">
            <span>Total</span>
            <PriceTag cents={total} />
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <InlineMessage tone="error">{error}</InlineMessage>
          </div>
        )}

        <Button size="lg" className="mt-5 w-full" isLoading={isSubmitting} onClick={handleConfirm}>
          Pagar con Mercado Pago
        </Button>
        <p className="mt-2 text-center text-xs text-text-muted">
          Vas a ser redirigido a Mercado Pago para completar el pago de forma segura.
        </p>
      </Card>
    </div>
  );
}
