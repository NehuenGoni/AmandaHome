import { cloudinary } from "../config/cloudinary.js";
import { env, isCloudinaryConfigured } from "../config/env.js";
import { ServiceUnavailableError } from "../utils/AppError.js";

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

const PRODUCT_IMAGES_FOLDER = "amanda/products";

/**
 * El browser sube directo a Cloudinary con esta firma; el server nunca ve
 * el archivo. Solo admin puede firmar subidas a la carpeta de productos.
 */
export function signProductImageUpload(): SignedUploadParams {
  if (!isCloudinaryConfigured) {
    throw new ServiceUnavailableError("La subida de imágenes no está configurada");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder: PRODUCT_IMAGES_FOLDER };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET!);

  return {
    signature,
    timestamp,
    apiKey: env.CLOUDINARY_API_KEY!,
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    folder: PRODUCT_IMAGES_FOLDER,
  };
}

// La firma para comprobantes de pago (carpeta por pedido, validando que el
// pedido pertenezca al usuario autenticado) se agrega en la fase de
// checkout/orders, cuando exista el modelo Order contra el que validar.
