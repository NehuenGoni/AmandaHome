import type { CarrierQuoteInput, CarrierRate, CarrierShipmentInput, ShippingCarrier } from "./carrier.js";

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

  async quote({ postalCodeOrigin, postalCodeDestination, package: pkg }: CarrierQuoteInput): Promise<CarrierRate> {
    const originNumber = Number.parseInt(postalCodeOrigin.replace(/\D/g, "").slice(0, 4) || "0", 10);
    const destNumber = Number.parseInt(postalCodeDestination.replace(/\D/g, "").slice(0, 4) || "0", 10);
    const distanceFactor = Math.abs(destNumber - originNumber) / 1000;

    // Base + variable por peso (cada 1kg suma) + variable por "distancia" simulada.
    const price = Math.round(150000 + (pkg.weight / 1000) * 40000 + distanceFactor * 30000);

    return {
      carrier: "correo_argentino_simulado",
      service: "CP",
      price,
      etaMinDays: 3,
      etaMaxDays: 6,
    };
  },

  async importShipment(_input: CarrierShipmentInput): Promise<void> {
    // No-op: en modo simulado no hay nada que cargar en un correo real.
  },
};
