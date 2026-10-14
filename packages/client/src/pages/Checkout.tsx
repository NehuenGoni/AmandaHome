import type { PublicShippingSettings, ShippingOption } from "@amanda/shared";
import { formatMoney } from "@amanda/shared";
import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import { getShippingSettings, quoteShipping } from "@/lib/shippingApi";
import { addAddress, type AddressInput } from "@/lib/usersApi";
import { cn } from "@/lib/utils";

export default function Checkout() {
  const { user, setUser } = useAuth();
  const { cart } = useCart();
  const [addressId, setAddressId] = useState(user?.addresses.find((a) => a.isDefault)?._id ?? "");
  const [showAddressForm, setShowAddressForm] = useState(user?.addresses.length === 0);
  const [shippingMethod, setShippingMethod] = useState<"pickup" | "home">("home");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [isQuoting, setIsQuoting] = useState(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PublicShippingSettings | null>(null);

  useEffect(() => {
    getShippingSettings()
      .then(({ settings: fetched }) => setSettings(fetched))
      .catch(() => {
        // Sin datos del local para mostrar; el checkout sigue funcionando igual.
      });
  }, []);

  const fetchQuote = useCallback(
    async (forHomeAddressId: string | undefined) => {
      setIsQuoting(true);
      setQuoteError(null);
      try {
        const { options: fetched } = await quoteShipping(forHomeAddressId);
        setOptions(fetched);
        // Si el método elegido quedó deshabilitado (o no había ninguno todavía), elegimos el primero disponible.
        setShippingMethod((current) =>
          fetched.some((o) => o.method === current) ? current : (fetched[0]?.method ?? current),
        );
      } catch (err) {
        setQuoteError(err instanceof ApiError ? err.message : "No pudimos calcular el envío");
      } finally {
        setIsQuoting(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (cart.items.length === 0) return;
    fetchQuote(addressId || undefined);
  }, [addressId, cart.items.length, fetchQuote]);

  if (cart.items.length === 0) return <Navigate to="/carrito" replace />;

  const selectedOption = options.find((o) => o.method === shippingMethod);
  const shippingCost = selectedOption?.cost ?? 0;
  const total = cart.subtotal + shippingCost;
  const pickupOption = options.find((o) => o.method === "pickup");
  const homeOption = options.find((o) => o.method === "home");

  async function handleAddAddress(input: AddressInput) {
    const result = await addAddress(input);
    setUser(result.user);
    const newAddress = result.user.addresses[result.user.addresses.length - 1];
    if (newAddress) setAddressId(newAddress._id);
    setShowAddressForm(false);
  }

  async function handleConfirm() {
    if (shippingMethod === "home" && !addressId) {
      setError("Elegí una dirección de envío");
      return;
    }
    if (!selectedOption) {
      setError("No pudimos calcular el costo de envío, volvé a intentar");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { checkoutUrl } = await createCheckout({
        addressId: shippingMethod === "home" ? addressId : undefined,
        shippingMethod,
        expectedShippingCost: selectedOption.cost,
        notes: undefined,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("El costo de envío cambió, revisá el nuevo precio y confirmá de nuevo");
        fetchQuote(addressId || undefined);
      } else {
        setError(err instanceof ApiError ? err.message : "No pudimos iniciar el pago");
      }
      setIsSubmitting(false);
    }
  }

  function renderCost(option: ShippingOption | undefined) {
    if (!option) return isQuoting ? "…" : "-";
    if (option.isFree) {
      return option.originalCost ? (
        <span className="flex items-center gap-1.5">
          <span className="text-text-muted line-through">{formatMoney(option.originalCost)}</span>
          <span>Gratis</span>
        </span>
      ) : (
        "Gratis"
      );
    }
    return formatMoney(option.cost);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-text">Método de envío</h2>
          <div className="flex flex-col gap-2">
            {pickupOption && (
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-colors",
                  shippingMethod === "pickup" ? "border-accent bg-accent/5" : "border-border bg-surface",
                )}
              >
                <span className="flex items-center gap-3 text-sm">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === "pickup"}
                    onChange={() => setShippingMethod("pickup")}
                  />
                  Retiro en el local
                </span>
                <span className="text-sm font-medium text-text">Gratis</span>
              </label>
            )}
            {homeOption && (
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-colors",
                  shippingMethod === "home" ? "border-accent bg-accent/5" : "border-border bg-surface",
                )}
              >
                <span className="flex items-center gap-3 text-sm">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === "home"}
                    onChange={() => setShippingMethod("home")}
                  />
                  <span>
                    Envío a domicilio
                    {homeOption.etaMinDays && homeOption.etaMaxDays && (
                      <span className="block text-xs text-text-muted">
                        Llega en {homeOption.etaMinDays}–{homeOption.etaMaxDays} días hábiles
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-sm font-medium text-text">{renderCost(homeOption)}</span>
              </label>
            )}
            {quoteError && <InlineMessage tone="error">{quoteError}</InlineMessage>}
          </div>
        </section>

        {shippingMethod === "pickup" ? (
          <section className="flex flex-col gap-2">
            <h2 className="font-display text-xl text-text">Retirás en</h2>
            <Card>
              {settings?.pickup.address && <p className="text-sm text-text">{settings.pickup.address}</p>}
              {settings?.pickup.hours && <p className="text-sm text-text-muted">{settings.pickup.hours}</p>}
              {settings?.pickup.instructions && (
                <p className="mt-1 text-sm text-text-muted">{settings.pickup.instructions}</p>
              )}
              <p className="mt-1 text-sm text-text-muted">
                Te vamos a avisar por mail cuando el pedido esté listo para retirar.
              </p>
            </Card>
          </section>
        ) : (
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
                        {address.street} {address.number}, {address.city}, {address.province} (
                        {address.postalCode})
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>
        )}
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
            <span>{isQuoting ? <Loader2 className="size-4 animate-spin" /> : renderCost(selectedOption)}</span>
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

        <Button
          size="lg"
          className="mt-5 w-full"
          isLoading={isSubmitting}
          disabled={isQuoting || !selectedOption}
          onClick={handleConfirm}
        >
          Pagar con Mercado Pago
        </Button>
        <p className="mt-2 text-center text-xs text-text-muted">
          Vas a ser redirigido a Mercado Pago para completar el pago de forma segura.
        </p>
      </Card>
    </div>
  );
}
