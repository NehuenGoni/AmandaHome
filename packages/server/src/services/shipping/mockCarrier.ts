import type { ShippingAgency, ShippingTrackingEvent } from "@amanda/shared";
import type { CarrierQuote, CarrierQuoteInput, CarrierShipmentInput, ShippingCarrier } from "./carrier.js";

/**
 * Proveedor simulado: se usa en desarrollo/test cuando no hay credenciales
 * de MiCorreo cargadas, para poder trabajar en la feature de envíos sin
 * depender de una cuenta comercial real. El precio es determinístico
 * (depende del CP de destino y el peso) para que sea fácil de testear.
 */
export const mockCarrier: ShippingCarrier = {
  isConfigured() {
    return true;
  },

  async quote({ postalCodeOrigin, postalCodeDestination, packages }: CarrierQuoteInput): Promise<CarrierQuote> {
    const originNumber = Number.parseInt(postalCodeOrigin.replace(/\D/g, "").slice(0, 4) || "0", 10);
    const destNumber = Number.parseInt(postalCodeDestination.replace(/\D/g, "").slice(0, 4) || "0", 10);
    const distanceFactor = Math.abs(destNumber - originNumber) / 1000;
    const weight = packages.reduce((sum, p) => sum + p.weight * p.quantity, 0);

    // Base + variable por peso (cada 1kg suma) + variable por "distancia" simulada.
    const home = Math.round(150000 + (weight / 1000) * 40000 + distanceFactor * 30000);
    const branch = Math.round(home * 0.8);
    const express = (price: number) => Math.round(price * 2.5);

    return {
      carrier: "correo_argentino_simulado",
      rates: [
        { deliveryType: "home", service: "CP", price: home, etaMinDays: 3, etaMaxDays: 6 },
        { deliveryType: "home", service: "EP", price: express(home), etaMinDays: 1, etaMaxDays: 3 },
        { deliveryType: "branch", service: "CP", price: branch, etaMinDays: 3, etaMaxDays: 6 },
        { deliveryType: "branch", service: "EP", price: express(branch), etaMinDays: 1, etaMaxDays: 3 },
      ],
      package: {
        weight,
        height: Math.max(...packages.map((p) => p.height)),
        width: Math.max(...packages.map((p) => p.width)),
        length: Math.max(...packages.map((p) => p.length)),
      },
    };
  },

  async listAgencies(provinceCode: string): Promise<ShippingAgency[]> {
    const weekday = { start: "0900", end: "1800" };
    const hours = { monday: weekday, tuesday: weekday, wednesday: weekday, thursday: weekday, friday: weekday };
    return [
      { code: `${provinceCode}0001`, name: "Sucursal Centro", address: "Av. Siempreviva 742", locality: "Centro", provinceCode, postalCode: "1000", hours },
      { code: `${provinceCode}0002`, name: "Sucursal Norte", address: "Calle Falsa 123", locality: "Norte", provinceCode, postalCode: "1400", hours },
      { code: `${provinceCode}0003`, name: "Sucursal Sur", address: "Mitre 1500", locality: "Sur", provinceCode, postalCode: "1800", hours },
    ];
  },

  async importShipment(_input: CarrierShipmentInput): Promise<void> {
    // No-op: en modo simulado no hay nada que cargar en un correo real.
  },

  async track(_trackingNumber: string): Promise<ShippingTrackingEvent[]> {
    return [
      { event: "EN TRANSITO", date: "02-01-2026 14:20", branch: "CTP MONTE GRANDE" },
      { event: "ADMISION", date: "01-01-2026 10:00", branch: "SUCURSAL CENTRO" },
      { event: "PREIMPOSICION", date: "31-12-2025 18:30", branch: "CORREO ARGENTINO" },
    ];
  },
};
