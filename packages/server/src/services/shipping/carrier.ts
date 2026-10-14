import type { OrderDocument } from "../../models/Order.js";

/**
 * MiCorreo cotiza y despacha un único paquete por envío (no por ítem): el
 * peso/medidas de los productos del carrito se agregan en uno solo antes de
 * llamar al carrier. Ver `shippingService.getPackageForItems`.
 */
export interface CarrierPackage {
  /** Gramos. */
  weight: number;
  /** Centímetros. */
  height: number;
  width: number;
  length: number;
}

export interface CarrierQuoteInput {
  postalCodeOrigin: string;
  postalCodeDestination: string;
  package: CarrierPackage;
}

export interface CarrierRate {
  carrier: string;
  service: string;
  /** Centavos. */
  price: number;
  etaMinDays?: number;
  etaMaxDays?: number;
}

export interface CarrierShipmentInput {
  order: OrderDocument;
  /** Nombre del destinatario (el cliente), no el de la dirección. */
  recipientName: string;
  recipientEmail: string;
  /** Pesos (no centavos): así lo pide la API de MiCorreo. */
  declaredValue: number;
  package: CarrierPackage;
}

/**
 * Abstrae el correo usado para cotizar y despachar envíos a domicilio, para
 * poder cambiarlo (o agregar otro) sin tocar `shippingService`.
 */
export interface ShippingCarrier {
  isConfigured(): boolean;
  quote(input: CarrierQuoteInput): Promise<CarrierRate>;
  importShipment(input: CarrierShipmentInput): Promise<void>;
}
