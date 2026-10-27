const FALLBACK_ORIGIN = "https://homedecoamanda.com";

/** Origen canónico del sitio, sin barra final. En dev/test cae al origen actual o a un valor fijo. */
export function getSiteUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location.origin) return window.location.origin;
  return FALLBACK_ORIGIN;
}

/** Convierte un path ("/productos/x") o una URL ya absoluta en URL absoluta del sitio. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${getSiteUrl()}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
