import type { ShippingAgency, ShippingService, ShippingTrackingEvent } from "@amanda/shared";
import type { OrderDocument } from "../../models/Order.js";

export interface CarrierPackage {
  /** Gramos. */
  weight: number;
  /** Centímetros. */
  height: number;
  width: number;
  length: number;
}

/** Un producto del carrito (con su cantidad): MiCorreo los apila en una sola caja al cotizar. */
export interface CarrierItemPackage extends CarrierPackage {
  quantity: number;
}

export interface CarrierQuoteInput {
  postalCodeOrigin: string;
  postalCodeDestination: string;
  packages: CarrierItemPackage[];
}

export type CarrierDeliveryType = "home" | "branch";

export interface CarrierRate {
  deliveryType: CarrierDeliveryType;
  service: ShippingService;
  /** Centavos. */
  price: number;
  etaMinDays?: number;
  etaMaxDays?: number;
}

export interface CarrierQuote {
  carrier: string;
  /** Todas las tarifas disponibles para el destino: domicilio/sucursal × Clásico/Expreso. */
  rates: CarrierRate[];
  /** Caja resultante de apilar los productos: se guarda en la orden y se usa al despachar. */
  package: CarrierPackage;
}

export interface CarrierShipmentInput {
  order: OrderDocument;
  /** Nombre del destinatario (el cliente), no el de la dirección. */
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;
  /** Pesos (no centavos): así lo pide la API de MiCorreo. */
  declaredValue: number;
  package: CarrierPackage;
}

/**
 * Abstrae el correo usado para cotizar y despachar envíos, para poder
 * cambiarlo (o agregar otro) sin tocar `shippingService`.
 */
export interface ShippingCarrier {
  isConfigured(): boolean;
  quote(input: CarrierQuoteInput): Promise<CarrierQuote>;
  /** Sucursales activas de una provincia donde el cliente puede retirar. */
  listAgencies(provinceCode: string): Promise<ShippingAgency[]>;
  /** Carga el envío en el correo; la dirección o sucursal y el servicio salen de la orden. */
  importShipment(input: CarrierShipmentInput): Promise<void>;
  /** Eventos de seguimiento, del más reciente al más viejo. */
  track(trackingNumber: string): Promise<ShippingTrackingEvent[]>;
}
