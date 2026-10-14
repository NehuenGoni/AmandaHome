export const SHIPPING_METHODS = ["pickup", "home"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

/** Traduce también los métodos viejos ("standard"/"express") de pedidos anteriores a este cambio. */
export function shippingMethodLabel(method: string): string {
  switch (method) {
    case "pickup":
      return "Retiro en el local";
    case "home":
    case "standard":
      return "Envío a domicilio";
    case "express":
      return "Envío express";
    default:
      return method;
  }
}

export interface ShippingOption {
  method: ShippingMethod;
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
}

export interface ShippingQuote {
  options: ShippingOption[];
  freeShippingThreshold?: number;
}

export interface ShippingPickupSettings {
  enabled: boolean;
  address?: string;
  hours?: string;
  instructions?: string;
}

export interface ShippingHomeSettings {
  enabled: boolean;
  /** Precio en centavos que se usa si el correo no está configurado o no responde. */
  fallbackCost: number;
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
  /** Centavos; sin definir = sin envío gratis. */
  freeShippingThreshold?: number;
  originPostalCode: string;
  defaultPackage: ShippingPackageDefaults;
}

/** Lo único que necesita ver el cliente (no expone el precio de respaldo ni el CP de origen). */
export interface PublicShippingSettings {
  pickup: ShippingPickupSettings;
  homeEnabled: boolean;
  freeShippingThreshold?: number;
}
