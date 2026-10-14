import { shippingMethodLabel, type ShippingOption } from "@amanda/shared";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { getShippingSettings } from "./shippingSettingsService.js";
import { shippingCarrier, type CarrierPackage, type CarrierRate } from "./shipping/index.js";
import type { ShippingSettingsDocument } from "../models/ShippingSettings.js";

export interface ShippingItemInput {
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
  quantity: number;
}

export interface QuoteShippingInput {
  items: ShippingItemInput[];
  /** Subtotal en centavos: se usa para decidir si aplica envío gratis. */
  subtotal: number;
  /** Sin esto no se puede cotizar el envío a domicilio: se usa el precio de respaldo. */
  destinationPostalCode?: string;
}

/**
 * MiCorreo cotiza y despacha un único paquete por envío, no uno por ítem:
 * se agregan todos los productos del carrito en una sola "caja". El peso
 * suma el de cada ítem (según su cantidad); el alto/ancho/largo toman el
 * máximo entre los ítems, para que la caja alcance a contener al más grande
 * (una aproximación razonable sin armar un bin-packing real).
 */
function buildPackage(items: ShippingItemInput[], settings: ShippingSettingsDocument): CarrierPackage {
  const defaults = settings.defaultPackage;
  if (items.length === 0) return { ...defaults };

  const weight = items.reduce((sum, item) => sum + (item.weight ?? defaults.weight) * item.quantity, 0);
  const height = Math.max(defaults.height, ...items.map((i) => i.height ?? 0));
  const width = Math.max(defaults.width, ...items.map((i) => i.width ?? 0));
  const length = Math.max(defaults.length, ...items.map((i) => i.length ?? 0));

  return { weight, height, width, length };
}

/** Expuesto para que el checkout pueda guardar el paquete usado en la cotización y reutilizarlo al despachar. */
export async function getPackageForItems(items: ShippingItemInput[]): Promise<CarrierPackage> {
  const settings = await getShippingSettings();
  return buildPackage(items, settings);
}

function applyFreeShipping(
  option: ShippingOption,
  subtotal: number,
  threshold: number | undefined,
): ShippingOption {
  if (option.cost === 0 || threshold === undefined || subtotal < threshold) {
    return { ...option, isFree: option.cost === 0 };
  }
  return { ...option, originalCost: option.cost, cost: 0, isFree: true };
}

async function quoteHomeDelivery(
  input: QuoteShippingInput,
  settings: ShippingSettingsDocument,
): Promise<ShippingOption> {
  const base: ShippingOption = {
    method: "home",
    label: shippingMethodLabel("home"),
    cost: settings.home.fallbackCost,
    isFree: settings.home.fallbackCost === 0,
    isFallback: true,
  };

  if (!input.destinationPostalCode) {
    return applyFreeShipping(base, input.subtotal, settings.freeShippingThreshold);
  }

  let rate: CarrierRate | undefined;
  try {
    rate = await shippingCarrier.quote({
      postalCodeOrigin: settings.originPostalCode,
      postalCodeDestination: input.destinationPostalCode,
      package: buildPackage(input.items, settings),
    });
  } catch {
    // El correo no pudo cotizar (no configurado, caído, destino sin cobertura):
    // se usa el precio de respaldo configurado en el admin en vez de bloquear el checkout.
    rate = undefined;
  }

  const option: ShippingOption = rate
    ? {
        method: "home",
        label: shippingMethodLabel("home"),
        cost: rate.price,
        isFree: rate.price === 0,
        etaMinDays: rate.etaMinDays,
        etaMaxDays: rate.etaMaxDays,
        carrier: rate.carrier,
      }
    : base;

  return applyFreeShipping(option, input.subtotal, settings.freeShippingThreshold);
}

/** Resuelve peso/medidas y subtotal del carrito del usuario, para cotizar sin duplicar la lógica en cada caller. */
export async function getShippingItemsForCart(
  userId: string,
): Promise<{ items: ShippingItemInput[]; subtotal: number }> {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) return { items: [], subtotal: 0 };

  const productIds = [...new Set(cart.items.map((i) => i.product.toString()))];
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const items: ShippingItemInput[] = [];
  let subtotal = 0;
  for (const cartItem of cart.items) {
    const product = productById.get(cartItem.product.toString());
    const variant = product?.variants.find((v) => v.sku === cartItem.variantSku);
    if (!product || !variant) continue;

    items.push({
      weight: variant.weight,
      height: variant.height,
      width: variant.width,
      length: variant.length,
      quantity: cartItem.quantity,
    });
    subtotal += variant.price * cartItem.quantity;
  }

  return { items, subtotal };
}

/** Única fuente de verdad para cotizar envíos: la usan tanto el endpoint de cotización como el checkout. */
export async function quoteShipping(input: QuoteShippingInput): Promise<ShippingOption[]> {
  const settings = await getShippingSettings();
  const options: ShippingOption[] = [];

  if (settings.pickup.enabled) {
    options.push({ method: "pickup", label: shippingMethodLabel("pickup"), cost: 0, isFree: true });
  }

  if (settings.home.enabled) {
    options.push(await quoteHomeDelivery(input, settings));
  }

  return options;
}
