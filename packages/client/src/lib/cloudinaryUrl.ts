/**
 * Inserta transformaciones de Cloudinary (formato y calidad automáticos + ancho)
 * en imágenes alojadas ahí. Las URLs externas o ya transformadas se devuelven igual.
 */
export function cloudinaryUrl(url: string, options: { width?: number } = {}): string {
  const marker = "/image/upload/";
  const index = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || index === -1) return url;

  const rest = url.slice(index + marker.length);
  // Si ya trae transformaciones (segmento con "_" antes de la versión/carpeta), no las pisamos.
  if (/^[a-z]{1,3}_[^/]+\//.test(rest)) return url;

  const transforms = ["f_auto", "q_auto", options.width ? `w_${options.width}` : null].filter(Boolean).join(",");
  return `${url.slice(0, index + marker.length)}${transforms}/${rest}`;
}
