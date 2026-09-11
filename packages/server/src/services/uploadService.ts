import { cloudinary } from "../config/cloudinary.js";
import { env, isCloudinaryConfigured } from "../config/env.js";
import { Order } from "../models/Order.js";
import { NotFoundError, ServiceUnavailableError } from "../utils/AppError.js";

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

const PRODUCT_IMAGES_FOLDER = "amanda/products";

function sign(folder: string): SignedUploadParams {
  if (!isCloudinaryConfigured) {
    throw new ServiceUnavailableError("La subida de imágenes no está configurada");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, env.CLOUDINARY_API_SECRET!);

  return {
    signature,
    timestamp,
    apiKey: env.CLOUDINARY_API_KEY!,
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    folder,
  };
}

/**
 * El browser sube directo a Cloudinary con esta firma; el server nunca ve
 * el archivo. Solo admin puede firmar subidas a la carpeta de productos.
 */
export function signProductImageUpload(): SignedUploadParams {
  return sign(PRODUCT_IMAGES_FOLDER);
}

/** Comprobantes: solo el dueño del pedido puede firmar una subida para su propia carpeta. */
export async function signReceiptUpload(orderId: string, userId: string): Promise<SignedUploadParams> {
  const order = await Order.exists({ _id: orderId, customer: userId });
  if (!order) throw new NotFoundError("Pedido no encontrado");

  return sign(`amanda/receipts/${orderId}`);
}
