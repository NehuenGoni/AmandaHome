import { findProvince, pesosToCents, type ShippingAgency, type ShippingTrackingEvent } from "@amanda/shared";
import { env, isCorreoArgentinoConfigured } from "../../config/env.js";
import { BadRequestError, ServiceUnavailableError } from "../../utils/AppError.js";
import type {
  CarrierItemPackage,
  CarrierQuote,
  CarrierQuoteInput,
  CarrierRate,
  CarrierShipmentInput,
  ShippingCarrier,
} from "./carrier.js";
import { TtlCache } from "./ttlCache.js";

const BASE_URL =
  env.MICORREO_ENV === "prod"
    ? "https://api.correoargentino.com.ar/micorreo/v1"
    : "https://apitest.correoargentino.com.ar/micorreo/v1";

const REQUEST_TIMEOUT_MS = 8000;
/** Esperas entre reintentos ante 429/5xx: la API pide retroceso exponencial. */
const RETRY_DELAYS_MS = [400, 1200];

/** Límites de la API por paquete (ver /rates/packages). */
const MAX_WEIGHT_GRAMS = 50_000;
const MAX_SIDE_CM = 200;
const MAX_SIDES_SUM_CM = 300;

const MAX_QUOTE_CACHE_MS = 30 * 60_000;
const AGENCIES_CACHE_MS = 12 * 60 * 60_000;
const TRACKING_CACHE_MS = 10 * 60_000;

const quoteCache = new TtlCache<CarrierQuote>(500);
const agenciesCache = new TtlCache<ShippingAgency[]>(30);
const trackingCache = new TtlCache<ShippingTrackingEvent[]>(500);

interface TokenResponse {
  token: string;
  expires: string;
}

let cachedToken: { token: string; expiresAt: number } | undefined;
/** Comparte el pedido de token en curso para no autenticar dos veces si llegan varias cotizaciones juntas. */
let pendingToken: Promise<string> | undefined;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new ServiceUnavailableError("No se pudo contactar a Correo Argentino");
  } finally {
    clearTimeout(timeout);
  }
}

async function requestToken(): Promise<string> {
  // Credenciales de integración (Basic Auth), distintas de la cuenta
  // normal de MiCorreo: Correo Argentino las entrega por separado para
  // cada ambiente (test/prod) a través de un ejecutivo comercial.
  const basicAuth = Buffer.from(`${env.MICORREO_USER}:${env.MICORREO_PASSWORD}`).toString("base64");
  const res = await fetchWithTimeout(`${BASE_URL}/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basicAuth}` },
  });

  if (!res.ok) {
    throw new ServiceUnavailableError("No se pudo autenticar con Correo Argentino");
  }

  const data = (await res.json()) as TokenResponse;
  cachedToken = { token: data.token, expiresAt: new Date(data.expires).getTime() };
  return data.token;
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  pendingToken ??= requestToken().finally(() => {
    pendingToken = undefined;
  });
  return pendingToken;
}

/**
 * Llamada autenticada a MiCorreo. Si el token fue rechazado (401) se pide
 * uno nuevo y se reintenta una vez; ante 429 o 5xx se reintenta con espera
 * creciente. Devuelve la última respuesta, sea cual sea su estado.
 */
async function correoFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let renewedToken = false;
  for (let attempt = 0; ; attempt++) {
    const token = await getToken();
    const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    if (res.status === 401 && !renewedToken) {
      renewedToken = true;
      cachedToken = undefined;
      continue;
    }
    const retryDelay = RETRY_DELAYS_MS[attempt];
    if ((res.status === 429 || res.status >= 500) && retryDelay !== undefined) {
      await sleep(retryDelay);
      continue;
    }
    return res;
  }
}

/** Mensaje de error que manda MiCorreo en el body (`message` o `error`), si lo hay. */
async function readErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { message?: unknown; error?: unknown };
    const message = body.message ?? body.error;
    return typeof message === "string" && message.trim() ? message.trim() : undefined;
  } catch {
    return undefined;
  }
}

function toEtaDays(value: unknown): number | undefined {
  const days = Number(value);
  return Number.isFinite(days) && days > 0 ? days : undefined;
}

function assertPackagesWithinLimits(packages: CarrierItemPackage[]): void {
  let totalWeight = 0;
  for (const pkg of packages) {
    const sides = [pkg.height, pkg.width, pkg.length];
    if (pkg.weight < 1 || pkg.weight > MAX_WEIGHT_GRAMS) {
      throw new BadRequestError("Un producto supera el peso máximo que acepta Correo Argentino (50 kg)");
    }
    if (sides.some((side) => side > MAX_SIDE_CM)) {
      throw new BadRequestError("Un producto supera la medida máxima por lado que acepta Correo Argentino (200 cm)");
    }
    if (sides.reduce((sum, side) => sum + side, 0) > MAX_SIDES_SUM_CM) {
      throw new BadRequestError("Un producto supera la suma de lados que acepta Correo Argentino (300 cm)");
    }
    totalWeight += pkg.weight * pkg.quantity;
  }
  if (totalWeight > MAX_WEIGHT_GRAMS) {
    throw new BadRequestError("El pedido supera el peso máximo de un envío de Correo Argentino (50 kg)");
  }
}

function quoteCacheKey({ postalCodeDestination, packages }: CarrierQuoteInput): string {
  const items = packages
    .map((p) => `${p.quantity}x${p.weight}/${p.height}/${p.width}/${p.length}`)
    .sort()
    .join(",");
  return `${postalCodeDestination}|${items}`;
}

interface PackagesRatesResponse {
  validTo?: string;
  dimensions?: { weight?: number; height?: number; width?: number; length?: number };
  rates?: Array<{
    deliveredType: "D" | "S";
    productType: string;
    productName: string;
    /** Pesos (con decimales), no centavos. */
    price: number;
    deliveryTimeMin?: string | number;
    deliveryTimeMax?: string | number;
  }>;
  erroMessage?: string | null;
}

interface AgencyResponseItem {
  code: string;
  name: string;
  services?: { packageReception?: boolean; pickupAvailability?: boolean };
  location?: {
    address?: {
      streetName?: string | null;
      streetNumber?: string | null;
      locality?: string | null;
      city?: string | null;
      provinceCode?: string | null;
      postalCode?: string | null;
    };
  };
  hours?: Record<string, { start: string; end: string } | null>;
  status?: string;
}

interface TrackingResponseItem {
  trackingNumber?: string;
  events?: Array<{ event?: string; date?: string; branch?: string; status?: string }>;
}

function toAgency(item: AgencyResponseItem, provinceCode: string): ShippingAgency | undefined {
  const address = item.location?.address;
  if (!item.code || !item.name || !address?.postalCode) return undefined;

  const hours: ShippingAgency["hours"] = {};
  for (const [day, range] of Object.entries(item.hours ?? {})) {
    if (range?.start && range.end && day !== "holidays") hours[day] = { start: range.start, end: range.end };
  }

  return {
    code: item.code,
    name: item.name,
    address: [address.streetName, address.streetNumber].filter(Boolean).join(" "),
    locality: address.locality ?? undefined,
    city: address.city ?? undefined,
    provinceCode: address.provinceCode ?? provinceCode,
    postalCode: address.postalCode,
    hours,
  };
}

/**
 * La API devuelve un array, un objeto suelto o `{ error, code: "0" }` (pedido
 * inexistente, o todavía sin eventos): todo se normaliza a una lista de eventos.
 */
function toTrackingEvents(data: unknown): ShippingTrackingEvent[] {
  const items: TrackingResponseItem[] = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : [];
  return items
    .flatMap((item) => item.events ?? [])
    .filter((e): e is { event: string; date: string; branch?: string; status?: string } => Boolean(e.event && e.date))
    .map((e) => ({
      event: e.event,
      date: e.date,
      branch: e.branch || undefined,
      status: e.status || undefined,
    }));
}

function assertConfigured(): void {
  if (!isCorreoArgentinoConfigured) {
    throw new ServiceUnavailableError("Correo Argentino no está configurado");
  }
}

export const correoArgentinoCarrier: ShippingCarrier = {
  isConfigured() {
    return isCorreoArgentinoConfigured;
  },

  async quote(input: CarrierQuoteInput): Promise<CarrierQuote> {
    assertConfigured();
    assertPackagesWithinLimits(input.packages);

    const cacheKey = quoteCacheKey(input);
    const cached = quoteCache.get(cacheKey);
    if (cached) return cached;

    const res = await correoFetch("/rates/packages", {
      method: "POST",
      body: JSON.stringify({
        customerId: env.MICORREO_CUSTOMER_ID,
        postalCodeOrigin: input.postalCodeOrigin,
        postalCodeDestination: input.postalCodeDestination,
        // null = cotiza domicilio y sucursal en la misma llamada.
        deliveredType: null,
        dimensions: input.packages.map((p) => ({
          quantity: p.quantity,
          weight: Math.round(p.weight),
          height: Math.round(p.height),
          width: Math.round(p.width),
          length: Math.round(p.length),
        })),
      }),
    });

    if (!res.ok) {
      throw new ServiceUnavailableError("No se pudo cotizar el envío con Correo Argentino");
    }

    const data = (await res.json()) as PackagesRatesResponse;
    if (data.erroMessage) {
      throw new ServiceUnavailableError(`Correo Argentino no pudo cotizar: ${data.erroMessage}`);
    }

    const rates: CarrierRate[] = (data.rates ?? [])
      .filter((r) => (r.deliveredType === "D" || r.deliveredType === "S") && (r.productType === "CP" || r.productType === "EP"))
      .map((r) => ({
        deliveryType: r.deliveredType === "D" ? "home" : "branch",
        service: r.productType as "CP" | "EP",
        price: pesosToCents(r.price),
        etaMinDays: toEtaDays(r.deliveryTimeMin),
        etaMaxDays: toEtaDays(r.deliveryTimeMax),
      }));
    if (rates.length === 0) {
      throw new ServiceUnavailableError("Correo Argentino no devolvió tarifas para este destino");
    }

    const largest = (side: "height" | "width" | "length") =>
      Math.max(...input.packages.map((p) => p[side]));
    const quote: CarrierQuote = {
      carrier: "correo_argentino",
      rates,
      package: {
        // El peso se suma acá: el que devuelve la API no siempre coincide con la suma de los productos.
        weight: Math.round(input.packages.reduce((sum, p) => sum + p.weight * p.quantity, 0)),
        height: Math.round(data.dimensions?.height ?? largest("height")),
        width: Math.round(data.dimensions?.width ?? largest("width")),
        length: Math.round(data.dimensions?.length ?? largest("length")),
      },
    };

    const validTo = data.validTo ? new Date(data.validTo).getTime() - Date.now() : MAX_QUOTE_CACHE_MS;
    quoteCache.set(cacheKey, quote, Math.min(Number.isNaN(validTo) ? 0 : validTo, MAX_QUOTE_CACHE_MS));
    return quote;
  },

  async listAgencies(provinceCode: string): Promise<ShippingAgency[]> {
    assertConfigured();

    const cached = agenciesCache.get(provinceCode);
    if (cached) return cached;

    const params = new URLSearchParams({ customerId: env.MICORREO_CUSTOMER_ID ?? "", provinceCode });
    const res = await correoFetch(`/agencies?${params.toString()}`, { method: "GET" });
    if (!res.ok) {
      throw new ServiceUnavailableError("No se pudieron obtener las sucursales de Correo Argentino");
    }

    const data = (await res.json()) as AgencyResponseItem[];
    const agencies = (Array.isArray(data) ? data : [])
      .filter((a) => (a.status ?? "ACTIVE") === "ACTIVE" && a.services?.pickupAvailability !== false)
      .map((a) => toAgency(a, provinceCode))
      .filter((a): a is ShippingAgency => a !== undefined)
      .sort((a, b) => (a.locality ?? a.name).localeCompare(b.locality ?? b.name, "es"));

    agenciesCache.set(provinceCode, agencies, AGENCIES_CACHE_MS);
    return agencies;
  },

  /**
   * Carga el envío en MiCorreo para que el admin pueda imprimir la etiqueta
   * desde su web. Es idempotente: MiCorreo rechaza un `extOrderId` repetido
   * con "La orden ya fue importada", y eso se toma como éxito.
   */
  async importShipment({
    order,
    recipientName,
    recipientEmail,
    recipientPhone,
    declaredValue,
    package: pkg,
  }: CarrierShipmentInput): Promise<void> {
    assertConfigured();

    const isBranch = order.shippingMethod === "branch";
    const agency = order.shippingDetails?.agency;
    const address = order.shippingAddress;
    let shippingTarget: Record<string, unknown>;

    if (isBranch) {
      if (!agency) throw new BadRequestError("El pedido no tiene una sucursal de destino");
      shippingTarget = { deliveryType: "S", agency: agency.code };
    } else {
      if (!address) throw new BadRequestError("El pedido no tiene una dirección de envío");
      const provinceCode = findProvince(address.province)?.code;
      if (!provinceCode) {
        throw new BadRequestError(`No se reconoce la provincia "${address.province}" para Correo Argentino`);
      }
      shippingTarget = {
        deliveryType: "D",
        agency: null,
        address: {
          streetName: address.street,
          streetNumber: address.number,
          city: address.city,
          provinceCode,
          postalCode: address.postalCode,
        },
      };
    }

    const res = await correoFetch("/shipping/import", {
      method: "POST",
      body: JSON.stringify({
        customerId: env.MICORREO_CUSTOMER_ID,
        extOrderId: order._id.toString(),
        orderNumber: String(order.orderNumber),
        recipient: {
          name: recipientName,
          email: recipientEmail,
          phone: recipientPhone ?? address?.phone,
        },
        shipping: {
          ...shippingTarget,
          // Pedidos anteriores a Clásico/Expreso no guardaban el servicio.
          productType: order.shippingDetails?.service ?? "CP",
          weight: Math.round(pkg.weight),
          declaredValue,
          height: Math.round(pkg.height),
          length: Math.round(pkg.length),
          width: Math.round(pkg.width),
        },
      }),
    });

    if (res.ok) return;

    const message = await readErrorMessage(res);
    if (message && /ya fue importada/i.test(message)) return;
    throw new ServiceUnavailableError(
      message ? `Correo Argentino rechazó el envío: ${message}` : "No se pudo cargar el envío en Correo Argentino",
    );
  },

  async track(trackingNumber: string): Promise<ShippingTrackingEvent[]> {
    assertConfigured();

    const cached = trackingCache.get(trackingNumber);
    if (cached) return cached;

    // El PDF lo muestra como GET con body, pero fetch no permite body en un
    // GET: se manda como query string (a confirmar contra el ambiente de test).
    const params = new URLSearchParams({ shippingId: trackingNumber });
    const res = await correoFetch(`/shipping/tracking?${params.toString()}`, { method: "GET" });
    if (!res.ok) {
      throw new ServiceUnavailableError("No se pudo consultar el seguimiento en Correo Argentino");
    }

    const events = toTrackingEvents(await res.json());
    trackingCache.set(trackingNumber, events, TRACKING_CACHE_MS);
    return events;
  },
};
