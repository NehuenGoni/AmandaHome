import { BUSINESS, type Category, type PublicProduct } from "@amanda/shared";
import { absoluteUrl, getSiteUrl } from "./siteUrl";

type JsonLd = Record<string, unknown>;

export function buildLocalBusinessJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "HomeGoodsStore",
    "@id": `${getSiteUrl()}/#store`,
    name: BUSINESS.name,
    url: getSiteUrl(),
    image: absoluteUrl("/local-estanterias.jpeg"),
    logo: absoluteUrl("/logo.png"),
    telephone: `+${BUSINESS.whatsappNumber}`,
    email: BUSINESS.email,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.locality,
      addressRegion: BUSINESS.region,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    hasMap: BUSINESS.mapsUrl,
    openingHoursSpecification: BUSINESS.openingHours.map((slot) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: slot.days,
      opens: slot.opens,
      closes: slot.closes,
    })),
    sameAs: [BUSINESS.instagramUrl],
  };
}

export function buildWebSiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BUSINESS.name,
    url: getSiteUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: `${getSiteUrl()}/catalogo?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildProductJsonLd(product: PublicProduct, category?: Pick<Category, "name" | "slug">): JsonLd[] {
  const prices = product.variants.map((v) => v.price / 100);
  const inStock = product.variants.some((v) => v.stock > 0);
  const availability = inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const url = absoluteUrl(`/productos/${product.slug}`);
  const low = Math.min(...prices);
  const high = Math.max(...prices);

  const offers =
    low === high
      ? {
          "@type": "Offer",
          url,
          priceCurrency: "ARS",
          price: low.toFixed(2),
          availability,
          itemCondition: "https://schema.org/NewCondition",
        }
      : {
          "@type": "AggregateOffer",
          url,
          priceCurrency: "ARS",
          lowPrice: low.toFixed(2),
          highPrice: high.toFixed(2),
          offerCount: product.variants.length,
          availability,
        };

  const productJsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    sku: product.variants[0]?.sku,
    ...(product.description ? { description: product.description } : {}),
    ...(product.images.length ? { image: product.images.map((img) => absoluteUrl(img.url)) } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    offers,
  };

  const crumbs = [{ name: "Inicio", path: "/" }];
  if (category) crumbs.push({ name: category.name, path: `/categoria/${category.slug}` });
  crumbs.push({ name: product.name, path: `/productos/${product.slug}` });

  return [productJsonLd, buildBreadcrumbJsonLd(crumbs)];
}
