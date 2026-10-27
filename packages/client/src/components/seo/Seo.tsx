import { BUSINESS } from "@amanda/shared";
import { Helmet } from "react-helmet-async";
import { absoluteUrl } from "@/lib/siteUrl";

const DEFAULT_DESCRIPTION =
  "Textiles, cerámica y decoración para tu casa. Tienda online y local en Grand Bourg, Buenos Aires.";
const DEFAULT_IMAGE = "/local-estanterias.jpeg";

interface SeoProps {
  /** Sin sufijo de marca; se agrega " | Amanda Home & Deco" salvo que `rawTitle` sea true. */
  title?: string;
  rawTitle?: boolean;
  description?: string;
  /** Path canónico ("/catalogo"). Sin él no se emite canonical. */
  path?: string;
  image?: string;
  type?: "website" | "product";
  noindex?: boolean;
  jsonLd?: object | object[];
}

export function truncateDescription(text: string | undefined, max = 155): string | undefined {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function Seo({
  title,
  rawTitle = false,
  description = DEFAULT_DESCRIPTION,
  path,
  image = DEFAULT_IMAGE,
  type = "website",
  noindex = false,
  jsonLd,
}: SeoProps) {
  const fullTitle = !title ? BUSINESS.name : rawTitle ? title : `${title} | ${BUSINESS.name}`;
  const canonical = path ? absoluteUrl(path) : undefined;
  const imageUrl = absoluteUrl(image);
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      {canonical && !noindex && <link rel="canonical" href={canonical} />}

      <meta property="og:site_name" content={BUSINESS.name} />
      <meta property="og:locale" content="es_AR" />
      <meta property="og:type" content={type === "product" ? "og:product" : "website"} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      {canonical && <meta property="og:url" content={canonical} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {blocks.map((block, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}

/** Atajo para páginas privadas o sin valor de búsqueda. */
export function NoIndex({ title }: { title?: string }) {
  return <Seo title={title} noindex />;
}
