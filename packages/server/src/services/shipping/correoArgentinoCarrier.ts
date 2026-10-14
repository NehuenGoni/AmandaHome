import { findProvince, pesosToCents } from "@amanda/shared";
import { env, isCorreoArgentinoConfigured } from "../../config/env.js";
import { ServiceUnavailableError } from "../../utils/AppError.js";
import type { CarrierQuoteInput, CarrierRate, CarrierShipmentInput, ShippingCarrier } from "./carrier.js";

const BASE_URL =
  env.MICORREO_ENV === "prod"
    ? "https://api.correoargentino.com.ar/micorreo/v1"
    : "https://apitest.correoargentino.com.ar/micorreo/v1";

const REQUEST_TIMEOUT_MS = 8000;

interface TokenResponse {
  token: string;
  expires: string;
}

let cachedToken: { token: string; expiresAt: number } | undefined;

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

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

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

interface RatesResponseItem {
  deliveredType: "D" | "S";
  productType: "CP" | "EP";
  productName: string;
  /** Pesos (con decimales), no centavos. */
  price: number;
  deliveryTimeMin?: number;
  deliveryTimeMax?: number;
}

interface RatesResponse {
  rates: RatesResponseItem[];
}

export const correoArgentinoCarrier: ShippingCarrier = {
  isConfigured() {
    return isCorreoArgentinoConfigured;
  },

  async quote({ postalCodeOrigin, postalCodeDestination, package: pkg }: CarrierQuoteInput): Promise<CarrierRate> {
    if (!isCorreoArgentinoConfigured) {
      throw new ServiceUnavailableError("Correo Argentino no está configurado");
    }

    const token = await getToken();
    const res = await fetchWithTimeout(`${BASE_URL}/rates`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: env.MICORREO_CUSTOMER_ID,
        postalCodeOrigin,
        postalCodeDestination,
        deliveredType: "D",
        // La API espera UN paquete por envío (no un array por ítem).
        dimensions: {
          weight: Math.round(pkg.weight),
          height: Math.round(pkg.height),
          width: Math.round(pkg.width),
          length: Math.round(pkg.length),
        },
      }),
    });

    if (!res.ok) {
      throw new ServiceUnavailableError("No se pudo cotizar el envío con Correo Argentino");
    }

    const data = (await res.json()) as RatesResponse;
    const rate = data.rates?.find((r) => r.deliveredType === "D") ?? data.rates?.[0];
    if (!rate) {
      throw new ServiceUnavailableError("Correo Argentino no devolvió una tarifa para este destino");
    }

    return {
      carrier: "correo_argentino",
      service: rate.productType,
      price: pesosToCents(rate.price),
      etaMinDays: rate.deliveryTimeMin,
      etaMaxDays: rate.deliveryTimeMax,
    };
  },

  /**
   * Carga el envío en MiCorreo para que el admin pueda imprimir la etiqueta
   * desde su web. No devuelve número de seguimiento: eso se sigue cargando
   * a mano al despachar, como hoy.
   */
  async importShipment({ order, recipientName, recipientEmail, declaredValue, package: pkg }: CarrierShipmentInput): Promise<void> {
    if (!isCorreoArgentinoConfigured) {
      throw new ServiceUnavailableError("Correo Argentino no está configurado");
    }
    const address = order.shippingAddress;
    if (!address) {
      throw new ServiceUnavailableError("El pedido no tiene una dirección de envío");
    }
    const provinceCode = findProvince(address.province)?.code;
    if (!provinceCode) {
      throw new ServiceUnavailableError(`No se reconoce la provincia "${address.province}" para Correo Argentino`);
    }

    const token = await getToken();
    const res = await fetchWithTimeout(`${BASE_URL}/shipping/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: env.MICORREO_CUSTOMER_ID,
        extOrderId: order._id.toString(),
        orderNumber: String(order.orderNumber),
        recipient: {
          name: recipientName,
          email: recipientEmail,
          phone: address.phone,
        },
        shipping: {
          deliveryType: "D",
          address: {
            streetName: address.street,
            streetNumber: address.number,
            city: address.city,
            provinceCode,
            postalCode: address.postalCode,
          },
          weight: Math.round(pkg.weight),
          declaredValue,
          height: Math.round(pkg.height),
          length: Math.round(pkg.length),
          width: Math.round(pkg.width),
        },
      }),
    });

    if (!res.ok) {
      throw new ServiceUnavailableError("No se pudo cargar el envío en Correo Argentino");
    }
  },
};
