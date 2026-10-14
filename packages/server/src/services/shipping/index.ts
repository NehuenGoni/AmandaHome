import { isCorreoArgentinoConfigured, isTest } from "../../config/env.js";
import { correoArgentinoCarrier } from "./correoArgentinoCarrier.js";
import { mockCarrier } from "./mockCarrier.js";
import type { ShippingCarrier } from "./carrier.js";

/**
 * Sin credenciales de MiCorreo (o en tests, para no depender de la red) se
 * usa un proveedor simulado; en cuanto se cargan las credenciales, se usa
 * Correo Argentino real sin tocar el resto del código.
 */
export const shippingCarrier: ShippingCarrier =
  !isTest && isCorreoArgentinoConfigured ? correoArgentinoCarrier : mockCarrier;

export * from "./carrier.js";
