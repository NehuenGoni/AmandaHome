/**
 * Función de Vercel que devuelve el index.html de la SPA con los meta tags del
 * producto o la categoría ya inyectados. Los crawlers de WhatsApp, Instagram y
 * Facebook no ejecutan JavaScript, así que sin esto todos los links
 * compartidos se verían con la preview genérica de la home.
 *
 * Ante cualquier falla devuelve el index.html sin tocar: la SPA sigue andando.
 *
 * Variables de entorno (opcionales):
 *  - API_URL:  URL pública del backend con /api al final.
 *  - SITE_URL: dominio canónico; si falta se usa el host de la request.
 */

interface Req {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): Res;
  send(body: string): void;
}

interface ApiProduct {
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  images: { url: string }[];
  variants: { sku: string; price: number; stock: number }[];
}
interface ApiCategory {
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

const DEFAULT_API_URL = "https://amanda-server.fly.dev/api";
const BRAND = "Amanda Home & Deco";

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function truncate(text: string | undefined, max = 155): string | undefined {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Misma transformación que lib/cloudinaryUrl.ts del cliente (esta función no comparte código con el bundle). */
function optimizeImage(url: string, width: number): string {
  const marker = "/image/upload/";
  const index = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || index === -1) return url;
  const rest = url.slice(index + marker.length);
  if (/^[a-z]{1,3}_[^/]+\//.test(rest)) return url;
  return `${url.slice(0, index + marker.length)}f_auto,q_auto,w_${width}/${rest}`;
}

interface Meta {
  title: string;
  description: string;
  path: string;
  image?: string;
  type: "website" | "product";
  jsonLd: object[];
}

function renderHead(meta: Meta, origin: string): string {
  const url = origin + meta.path;
  const image = meta.image ?? `${origin}/local-estanterias.jpeg`;
  // data-rh: react-helmet-async reemplaza estos tags cuando la SPA arranca, así no quedan duplicados.
  return [
    `<title>${esc(meta.title)}</title>`,
    `<meta data-rh="true" name="description" content="${esc(meta.description)}" />`,
    `<link data-rh="true" rel="canonical" href="${esc(url)}" />`,
    `<meta data-rh="true" property="og:site_name" content="${BRAND}" />`,
    `<meta data-rh="true" property="og:locale" content="es_AR" />`,
    `<meta data-rh="true" property="og:type" content="${meta.type === "product" ? "og:product" : "website"}" />`,
    `<meta data-rh="true" property="og:title" content="${esc(meta.title)}" />`,
    `<meta data-rh="true" property="og:description" content="${esc(meta.description)}" />`,
    `<meta data-rh="true" property="og:image" content="${esc(image)}" />`,
    `<meta data-rh="true" property="og:url" content="${esc(url)}" />`,
    `<meta data-rh="true" name="twitter:card" content="summary_large_image" />`,
    `<meta data-rh="true" name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta data-rh="true" name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta data-rh="true" name="twitter:image" content="${esc(image)}" />`,
    ...meta.jsonLd.map(
      // "<" escapado para que un texto con "</script>" no cierre el bloque.
      (block) => `<script data-rh="true" type="application/ld+json">${JSON.stringify(block).replace(/</g, "\\u003c")}</script>`,
    ),
  ].join("\n    ");
}

function inject(html: string, meta: Meta, origin: string): string {
  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta[^>]+(?:name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/gi, "")
    .replace(/<link[^>]+rel="canonical"[^>]*>\s*/gi, "");
  return stripped.replace("</head>", `    ${renderHead(meta, origin)}\n  </head>`);
}

function productMeta(product: ApiProduct, origin: string): Meta {
  const prices = product.variants.map((v) => v.price / 100);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const availability = product.variants.some((v) => v.stock > 0)
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
  const path = `/productos/${product.slug}`;
  const images = product.images.map((img) => optimizeImage(img.url, 1200));

  const offers =
    low === high
      ? { "@type": "Offer", url: origin + path, priceCurrency: "ARS", price: low.toFixed(2), availability }
      : {
          "@type": "AggregateOffer",
          url: origin + path,
          priceCurrency: "ARS",
          lowPrice: low.toFixed(2),
          highPrice: high.toFixed(2),
          offerCount: product.variants.length,
          availability,
        };

  return {
    title: `${product.name} | ${BRAND}`,
    description:
      truncate(product.description) ??
      `Comprá ${product.name} en ${BRAND}. Envíos a todo el país y retiro en el local de Grand Bourg.`,
    path,
    image: images[0],
    type: "product",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        url: origin + path,
        sku: product.variants[0]?.sku,
        ...(product.description ? { description: product.description } : {}),
        ...(images.length ? { image: images } : {}),
        ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
        offers,
      },
    ],
  };
}

function categoryMeta(category: ApiCategory): Meta {
  return {
    title: `${category.name} para tu casa | ${BRAND}`,
    description:
      truncate(category.description) ??
      `Descubrí ${category.name.toLowerCase()} en ${BRAND}. Comprá online o pasá por el local en Grand Bourg.`,
    path: `/categoria/${category.slug}`,
    image: category.image,
    type: "website",
    jsonLd: [],
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  return res.ok ? ((await res.json()) as T) : null;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function handler(req: Req, res: Res) {
  const host = first(req.headers["x-forwarded-host"]) ?? first(req.headers.host) ?? "";
  const origin = (process.env.SITE_URL ?? `https://${host}`).replace(/\/+$/, "");
  const apiUrl = (process.env.API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "");
  const kind = first(req.query.type);
  const slug = first(req.query.slug);

  let html = "";
  try {
    const shell = await fetch(`${origin}/index.html`);
    html = await shell.text();
    if (!shell.ok || !html.includes("</head>")) throw new Error("index.html no disponible");

    if (slug && (kind === "product" || kind === "category")) {
      const encoded = encodeURIComponent(slug);
      const meta =
        kind === "product"
          ? await fetchJson<{ product: ApiProduct }>(`${apiUrl}/products/${encoded}`).then((r) =>
              r ? productMeta(r.product, origin) : null,
            )
          : await fetchJson<{ category: ApiCategory }>(`${apiUrl}/categories/${encoded}`).then((r) =>
              r ? categoryMeta(r.category) : null,
            );
      if (meta) html = inject(html, meta, origin);
    }
  } catch {
    // Sin meta específicos: se sirve el shell tal cual (o vacío si ni siquiera se pudo leer).
  }

  if (!html) {
    res.status(502).send("Servicio no disponible");
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.status(200).send(html);
}
