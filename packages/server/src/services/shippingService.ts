import {
  shippingMethodLabel,
  shippingOptionId,
  type ShippingAgency,
  type ShippingOption,
} from "@amanda/shared";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { NotFoundError } from "../utils/AppError.js";
import { getShippingSettings } from "./shippingSettingsService.js";
import {
  shippingCarrier,
  type CarrierDeliveryType,
  type CarrierItemPackage,
  type CarrierPackage,
  type CarrierQuote,
} from "./shipping/index.js";
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
  /** Sucursal elegida para retirar (ya resuelta con `findAgency`). Sin esto no se ofrece el retiro en sucursal. */
  agency?: ShippingAgency;
}

export interface QuoteShippingResult {
  options: ShippingOption[];
  /** Caja usada para cotizar cada método por correo: se guarda en la orden para despachar. */
  packages: Partial<Record<CarrierDeliveryType, CarrierPackage>>;
}

/** Cada producto con sus medidas; los que no tienen cargadas usan el paquete por defecto del admin. */
function toItemPackages(items: ShippingItemInput[], settings: ShippingSettingsDocument): CarrierItemPackage[] {
  const defaults = settings.defaultPackage;
  if (items.length === 0) return [{ ...defaults, quantity: 1 }];

  return items.map((item) => ({
    weight: item.weight ?? defaults.weight,
    height: item.height ?? defaults.height,
    width: item.width ?? defaults.width,
    length: item.length ?? defaults.length,
    quantity: item.quantity,
  }));
}

/**
 * Caja aproximada para cuando el correo no cotizó (y por lo tanto no apiló):
 * suma los pesos y toma la medida más grande de cada lado.
 */
function approximatePackage(packages: CarrierItemPackage[]): CarrierPackage {
  return {
    weight: packages.reduce((sum, p) => sum + p.weight * p.quantity, 0),
    height: Math.max(...packages.map((p) => p.height)),
    width: Math.max(...packages.map((p) => p.width)),
    length: Math.max(...packages.map((p) => p.length)),
  };
}

/** El envío gratis aplica solo al servicio Clásico: el Expreso se cobra siempre. */
function applyFreeShipping(
  option: ShippingOption,
  subtotal: number,
  threshold: number | undefined,
): ShippingOption {
  const qualifies = option.service !== "EP" && threshold !== undefined && subtotal >= threshold;
  if (option.cost === 0 || !qualifies) {
    return { ...option, isFree: option.cost === 0 };
  }
  return { ...option, originalCost: option.cost, cost: 0, isFree: true };
}

async function tryQuote(
  settings: ShippingSettingsDocument,
  postalCodeDestination: string,
  packages: CarrierItemPackage[],
): Promise<CarrierQuote | undefined> {
  try {
    return await shippingCarrier.quote({
      postalCodeOrigin: settings.originPostalCode,
      postalCodeDestination,
      packages,
    });
  } catch {
    // El correo no pudo cotizar (no configurado, caído, destino sin cobertura,
    // medidas fuera de límite): el caller decide si usa el precio de respaldo.
    return undefined;
  }
}

function carrierOptions(
  quote: CarrierQuote,
  deliveryType: CarrierDeliveryType,
  settings: ShippingSettingsDocument,
  agency?: ShippingAgency,
): ShippingOption[] {
  return quote.rates
    .filter((rate) => rate.deliveryType === deliveryType)
    .filter((rate) => rate.service === "CP" || settings.home.expressEnabled)
    .sort((a, b) => (a.service === b.service ? 0 : a.service === "CP" ? -1 : 1))
    .map((rate) => ({
      id: shippingOptionId(deliveryType, rate.service),
      method: deliveryType,
      service: rate.service,
      label: shippingMethodLabel(deliveryType),
      cost: rate.price,
      isFree: rate.price === 0,
      etaMinDays: rate.etaMinDays,
      etaMaxDays: rate.etaMaxDays,
      carrier: quote.carrier,
      agency,
    }));
}

async function quoteHomeDelivery(
  input: QuoteShippingInput,
  settings: ShippingSettingsDocument,
  packages: CarrierItemPackage[],
): Promise<{ options: ShippingOption[]; package: CarrierPackage }> {
  const quote = input.destinationPostalCode
    ? await tryQuote(settings, input.destinationPostalCode, packages)
    : undefined;
  const options = quote ? carrierOptions(quote, "home", settings) : [];

  if (options.length > 0) return { options, package: quote!.package };

  // Sin CP o sin cotización: se ofrece el Clásico con el precio de respaldo
  // configurado en el admin, en vez de bloquear el checkout.
  return {
    options: [
      {
        id: shippingOptionId("home", "CP"),
        method: "home",
        service: "CP",
        label: shippingMethodLabel("home"),
        cost: settings.home.fallbackCost,
        isFree: settings.home.fallbackCost === 0,
        isFallback: true,
      },
    ],
    package: approximatePackage(packages),
  };
}

/** Caja estimada sin pasar por el correo: para pedidos viejos que no guardaron el paquete cotizado. */
export async function estimatePackage(items: ShippingItemInput[]): Promise<CarrierPackage> {
  const settings = await getShippingSettings();
  return approximatePackage(toItemPackages(items, settings));
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

export async function listAgencies(provinceCode: string): Promise<ShippingAgency[]> {
  const settings = await getShippingSettings();
  if (!settings.branch.enabled) return [];
  return shippingCarrier.listAgencies(provinceCode);
}

/** Busca la sucursal en la lista del correo: nunca se confía en el CP o la dirección que mande el cliente. */
export async function findAgency(provinceCode: string, agencyCode: string): Promise<ShippingAgency> {
  const agency = (await shippingCarrier.listAgencies(provinceCode)).find((a) => a.code === agencyCode);
  if (!agency) throw new NotFoundError("Sucursal no encontrada");
  return agency;
}

/** Única fuente de verdad para cotizar envíos: la usan tanto el endpoint de cotización como el checkout. */
export async function quoteShipping(input: QuoteShippingInput): Promise<QuoteShippingResult> {
  const settings = await getShippingSettings();
  const packages = toItemPackages(input.items, settings);
  const result: QuoteShippingResult = { options: [], packages: {} };

  if (settings.pickup.enabled) {
    result.options.push({
      id: shippingOptionId("pickup"),
      method: "pickup",
      label: shippingMethodLabel("pickup"),
      cost: 0,
      isFree: true,
    });
  }

  if (settings.home.enabled) {
    const home = await quoteHomeDelivery(input, settings, packages);
    result.options.push(...home.options);
    result.packages.home = home.package;
  }

  // La sucursal no tiene precio de respaldo: si el correo no cotiza, no se ofrece.
  if (settings.branch.enabled && input.agency) {
    const quote = await tryQuote(settings, input.agency.postalCode, packages);
    if (quote) {
      result.options.push(...carrierOptions(quote, "branch", settings, input.agency));
      result.packages.branch = quote.package;
    }
  }

  result.options = result.options.map((option) =>
    applyFreeShipping(option, input.subtotal, settings.freeShippingThreshold),
  );
  return result;
}
