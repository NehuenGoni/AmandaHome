export const SHIPPING_METHODS = ["pickup", "home", "branch"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

/** Servicios de MiCorreo: "CP" = Clásico, "EP" = Expreso. */
export const SHIPPING_SERVICES = ["CP", "EP"] as const;
export type ShippingService = (typeof SHIPPING_SERVICES)[number];

/** Métodos que se despachan por correo (los que hay que cargar en MiCorreo). */
export function isCarrierShippingMethod(method: string): boolean {
  return method === "home" || method === "branch";
}

/** Traduce también los métodos viejos ("standard"/"express") de pedidos anteriores a este cambio. */
export function shippingMethodLabel(method: string): string {
  switch (method) {
    case "pickup":
      return "Retiro en el local";
    case "home":
    case "standard":
      return "Envío a domicilio";
    case "branch":
      return "Retiro en sucursal de Correo";
    case "express":
      return "Envío express";
    default:
      return method;
  }
}

export function shippingServiceLabel(service: string | undefined): string | undefined {
  switch (service) {
    case "CP":
      return "Clásico";
    case "EP":
      return "Expreso";
    default:
      return undefined;
  }
}

/** Identificador estable de una opción de envío: "pickup", "home:CP", "branch:EP", etc. */
export function shippingOptionId(method: ShippingMethod, service?: ShippingService): string {
  return service ? `${method}:${service}` : method;
}

export function parseShippingOptionId(id: string): { method: ShippingMethod; service?: ShippingService } | undefined {
  const [method, service] = id.split(":");
  if (!(SHIPPING_METHODS as readonly string[]).includes(method ?? "")) return undefined;
  if (service !== undefined && !(SHIPPING_SERVICES as readonly string[]).includes(service)) return undefined;
  if (method === "pickup" ? service !== undefined : service === undefined) return undefined;
  return { method: method as ShippingMethod, service: service as ShippingService | undefined };
}

export interface ShippingAgencyHours {
  start: string;
  end: string;
}

/** Sucursal de Correo Argentino donde el cliente puede retirar su pedido. */
export interface ShippingAgency {
  code: string;
  name: string;
  /** Calle y número, listo para mostrar. */
  address: string;
  locality?: string;
  city?: string;
  provinceCode: string;
  postalCode: string;
  /** Claves "monday"…"sunday"; ausente = cerrado ese día. */
  hours?: Partial<Record<string, ShippingAgencyHours>>;
}

export interface ShippingOption {
  /** Ver `shippingOptionId`. */
  id: string;
  method: ShippingMethod;
  /** Ausente en el retiro en el local. */
  service?: ShippingService;
  label: string;
  /** Costo final en centavos (ya con el descuento de envío gratis aplicado, si corresponde). */
  cost: number;
  /** Costo sin el descuento de envío gratis, para mostrar "Gratis (antes $X)". */
  originalCost?: number;
  isFree: boolean;
  etaMinDays?: number;
  etaMaxDays?: number;
  carrier?: string;
  /** Si el costo viene del precio de respaldo porque el correo no pudo cotizar. */
  isFallback?: boolean;
  /** Solo en las opciones de retiro en sucursal. */
  agency?: ShippingAgency;
}

export interface ShippingQuote {
  options: ShippingOption[];
  freeShippingThreshold?: number;
}

export interface ShippingTrackingEvent {
  event: string;
  /** Como lo manda MiCorreo: "dd-mm-aaaa hh:mm". */
  date: string;
  branch?: string;
  status?: string;
}

export interface ShippingPickupSettings {
  enabled: boolean;
  address?: string;
  hours?: string;
  instructions?: string;
}

export interface ShippingHomeSettings {
  enabled: boolean;
  /** Ofrecer también el Expreso (más rápido y más caro) además del Clásico, a domicilio y a sucursal. */
  expressEnabled: boolean;
  /** Precio en centavos que se usa si el correo no está configurado o no responde. */
  fallbackCost: number;
}

export interface ShippingBranchSettings {
  enabled: boolean;
}

export interface ShippingPackageDefaults {
  /** Gramos. */
  weight: number;
  /** Centímetros. */
  height: number;
  width: number;
  length: number;
}

export interface ShippingSettings {
  pickup: ShippingPickupSettings;
  home: ShippingHomeSettings;
  branch: ShippingBranchSettings;
  /** Centavos; sin definir = sin envío gratis. Aplica solo al servicio Clásico. */
  freeShippingThreshold?: number;
  originPostalCode: string;
  defaultPackage: ShippingPackageDefaults;
}

/** Lo único que necesita ver el cliente (no expone el precio de respaldo ni el CP de origen). */
export interface PublicShippingSettings {
  pickup: ShippingPickupSettings;
  homeEnabled: boolean;
  branchEnabled: boolean;
  freeShippingThreshold?: number;
}
