export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/** El archivo va directo del browser a Cloudinary con la firma que emitió el backend; nunca pasa por nuestro server. */
export async function uploadToCloudinary(file: File, params: SignedUploadParams): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", params.apiKey);
  formData.append("timestamp", String(params.timestamp));
  formData.append("signature", params.signature);
  formData.append("folder", params.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${params.cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("No se pudo subir el archivo");
  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
