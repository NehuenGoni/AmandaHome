import type { PublicShippingSettings, ShippingAgency, ShippingOption } from "@amanda/shared";
import { findProvince, formatMoney, parseShippingOptionId, shippingServiceLabel } from "@amanda/shared";
import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AddressForm } from "@/components/account/AddressForm";
import { AgencyPicker } from "@/components/orders/AgencyPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { PriceTag } from "@/components/ui/PriceTag";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { trackBeginCheckout } from "@/lib/analytics";
import { ApiError } from "@/lib/apiClient";
import { createCheckout } from "@/lib/checkoutApi";
import { getShippingSettings, quoteShipping } from "@/lib/shippingApi";
import { addAddress, type AddressInput } from "@/lib/usersApi";
import { cn } from "@/lib/utils";

/** Id "provisorio" para el retiro en sucursal mientras el cliente todavía no eligió una (sin sucursal no hay precio). */
const BRANCH_PENDING_ID = "branch:CP";

function etaLabel(option: ShippingOption): string | undefined {
  if (!option.etaMinDays || !option.etaMaxDays) return undefined;
  const days =
    option.etaMinDays === option.etaMaxDays
      ? `${option.etaMinDays}`
      : `${option.etaMinDays} a ${option.etaMaxDays}`;
  return `${option.method === "branch" ? "Disponible" : "Llega"} en ${days} días hábiles`;
}

export default function Checkout() {
  const { user, setUser } = useAuth();
  const { cart } = useCart();
  const [addressId, setAddressId] = useState(user?.addresses.find((a) => a.isDefault)?._id ?? "");
  const [showAddressForm, setShowAddressForm] = useState(user?.addresses.length === 0);
  const [selectedId, setSelectedId] = useState("home:CP");
  const [provinceCode, setProvinceCode] = useState("");
  const [agency, setAgency] = useState<ShippingAgency | null>(null);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [isQuoting, setIsQuoting] = useState(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PublicShippingSettings | null>(null);

  const selectedMethod = parseShippingOptionId(selectedId)?.method ?? "home";

  useEffect(() => {
    getShippingSettings()
      .then(({ settings: fetched }) => setSettings(fetched))
      .catch(() => {
        // Sin datos del local para mostrar; el checkout sigue funcionando igual.
      });
  }, []);

  // La provincia de la sucursal arranca en la de la dirección elegida, si hay una.
  useEffect(() => {
    if (provinceCode) return;
    const address = user?.addresses.find((a) => a._id === addressId);
    const code = address && findProvince(address.province)?.code;
    if (code) setProvinceCode(code);
  }, [addressId, provinceCode, user]);

  const fetchQuote = useCallback(async (forAddressId: string | undefined, forAgency: ShippingAgency | null) => {
    setIsQuoting(true);
    setQuoteError(null);
    try {
      const { options: fetched } = await quoteShipping({
        addressId: forAddressId,
        agencyCode: forAgency?.code,
        provinceCode: forAgency?.provinceCode,
      });
      setOptions(fetched);
      if (forAgency && !fetched.some((o) => o.method === "branch")) {
        setQuoteError("No pudimos cotizar el envío a esa sucursal. Probá con otra o elegí otro método.");
      }
      // Si la opción elegida ya no está (o no había ninguna todavía), se elige la primera disponible.
      // El retiro en sucursal se respeta aunque todavía no tenga precio, para no esconder el selector.
      setSelectedId((current) => {
        if (fetched.some((o) => o.id === current)) return current;
        if (parseShippingOptionId(current)?.method === "branch") {
          return fetched.find((o) => o.method === "branch")?.id ?? current;
        }
        return fetched[0]?.id ?? current;
      });
    } catch (err) {
      setQuoteError(err instanceof ApiError ? err.message : "No pudimos calcular el envío");
    } finally {
      setIsQuoting(false);
    }
  }, []);

  useEffect(() => {
    if (cart.items.length === 0) return;
    fetchQuote(addressId || undefined, agency);
  }, [addressId, agency, cart.items.length, fetchQuote]);

  // Una sola vez por visita al checkout, no cada vez que cambia el envío o la dirección.
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (checkoutTracked.current || cart.items.length === 0) return;
    checkoutTracked.current = true;
    trackBeginCheckout(
      cart.subtotal,
      cart.items.map((item) => ({
        item_id: item.variantSku,
        item_name: item.name,
        item_variant: item.attributeValue,
        price: item.unitPrice / 100,
        quantity: item.quantity,
      })),
    );
  }, [cart]);

  if (cart.items.length === 0) return <Navigate to="/carrito" replace />;

  const selectedOption = options.find((o) => o.id === selectedId);
  const shippingCost = selectedOption?.cost ?? 0;
  const total = cart.subtotal + shippingCost;
  const hasBranchOptions = options.some((o) => o.method === "branch");
  // Antes de elegir una sucursal no hay cotización de sucursal: se muestra una fila para poder elegirla.
  const showBranchPlaceholder = Boolean(settings?.branchEnabled) && !hasBranchOptions;

  async function handleAddAddress(input: AddressInput) {
    const result = await addAddress(input);
    setUser(result.user);
    const newAddress = result.user.addresses[result.user.addresses.length - 1];
    if (newAddress) setAddressId(newAddress._id);
    setShowAddressForm(false);
  }

  function handleProvinceChange(code: string) {
    setProvinceCode(code);
    setAgency(null);
  }

  async function handleConfirm() {
    if (selectedMethod === "home" && !addressId) {
      setError("Elegí una dirección de envío");
      return;
    }
    if (selectedMethod === "branch" && !agency) {
      setError("Elegí la sucursal de Correo donde vas a retirar");
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
        addressId: selectedMethod === "home" ? addressId : undefined,
        shippingOptionId: selectedOption.id,
        agencyCode: selectedMethod === "branch" ? agency?.code : undefined,
        provinceCode: selectedMethod === "branch" ? agency?.provinceCode : undefined,
        expectedShippingCost: selectedOption.cost,
        notes: undefined,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("El costo de envío cambió, revisá el nuevo precio y confirmá de nuevo");
        fetchQuote(addressId || undefined, agency);
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

  function renderOptionRow(id: string, title: string, detail: string | undefined, cost: ReactNode) {
    return (
      <label
        key={id}
        className={cn(
          "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-colors",
          selectedId === id ? "border-accent bg-accent/5" : "border-border bg-surface",
        )}
      >
        <span className="flex items-center gap-3 text-sm">
          <input type="radio" name="shipping" checked={selectedId === id} onChange={() => setSelectedId(id)} />
          <span>
            {title}
            {detail && <span className="block text-xs text-text-muted">{detail}</span>}
          </span>
        </span>
        <span className="shrink-0 text-sm font-medium text-text">{cost}</span>
      </label>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-text">Método de envío</h2>
          <div className="flex flex-col gap-2">
            {options.map((option) => {
              const service = option.method === "pickup" ? undefined : shippingServiceLabel(option.service);
              const detail =
                option.method === "branch" && option.agency
                  ? [option.agency.name, etaLabel(option)].filter(Boolean).join(" · ")
                  : etaLabel(option);
              return renderOptionRow(
                option.id,
                service ? `${option.label} · ${service}` : option.label,
                detail,
                renderCost(option),
              );
            })}
            {showBranchPlaceholder &&
              renderOptionRow(
                BRANCH_PENDING_ID,
                "Retiro en sucursal de Correo",
                "Elegí la sucursal para ver el precio",
                isQuoting && agency ? "…" : "",
              )}
            {quoteError && <InlineMessage tone="error">{quoteError}</InlineMessage>}
          </div>
        </section>

        {selectedMethod === "pickup" ? (
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
        ) : selectedMethod === "branch" ? (
          <section className="flex flex-col gap-4">
            <h2 className="font-display text-xl text-text">Sucursal de retiro</h2>
            <AgencyPicker
              provinceCode={provinceCode}
              onProvinceChange={handleProvinceChange}
              selectedCode={agency?.code}
              onSelect={setAgency}
            />
            <p className="text-xs text-text-muted">
              Vas a necesitar tu DNI para retirar. Correo Argentino te avisa por mail cuando el paquete llegue a la
              sucursal.
            </p>
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
