import type { PublicProduct, PublicProductVariant } from "@amanda/shared";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const CURRENCY = "ARS";
const PURCHASE_STORAGE_KEY = "amanda:ga-purchases";

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_variant?: string;
  item_brand?: string;
  price: number;
  quantity?: number;
}

function measurementId(): string | undefined {
  return import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || undefined;
}

/** Solo medimos el sitio público: el panel /admin es uso interno y ensucia los datos. */
export function isTrackablePath(pathname: string): boolean {
  return !pathname.startsWith("/admin");
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(measurementId()) && import.meta.env.PROD;
}

let initialized = false;

export function initAnalytics(): void {
  const id = measurementId();
  if (initialized || !id || !import.meta.env.PROD || typeof document === "undefined") return;
  initialized = true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  // Los page_view los manda RouteTracker (la SPA no recarga al navegar).
  window.gtag("config", id, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!isAnalyticsEnabled() || !window.gtag) return;
  if (!isTrackablePath(window.location.pathname)) return;
  window.gtag("event", name, params);
}

export function trackPageView(path: string): void {
  trackEvent("page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/** Los precios del sistema están en centavos; GA espera pesos. */
function toItem(
  product: Pick<PublicProduct, "_id" | "name" | "brand">,
  variant: Pick<PublicProductVariant, "sku" | "price" | "attributeValue"> | undefined,
  quantity?: number,
  fallbackPriceCents?: number,
): AnalyticsItem {
  return {
    item_id: variant?.sku ?? product._id,
    item_name: product.name,
    item_variant: variant?.attributeValue,
    item_brand: product.brand,
    price: (variant?.price ?? fallbackPriceCents ?? 0) / 100,
    quantity,
  };
}

export function trackViewItem(product: PublicProduct, variant: PublicProductVariant | null): void {
  const item = toItem(product, variant ?? undefined, 1, product.variants[0]?.price);
  trackEvent("view_item", { currency: CURRENCY, value: item.price, items: [item] });
}

export function trackViewItemList(listName: string, products: PublicProduct[]): void {
  if (products.length === 0) return;
  trackEvent("view_item_list", {
    item_list_name: listName,
    items: products.map((p) => toItem(p, p.variants[0], undefined)),
  });
}

export function trackAddToCart(
  product: Pick<PublicProduct, "_id" | "name" | "brand">,
  variant: PublicProductVariant,
  quantity: number,
): void {
  const item = toItem(product, variant, quantity);
  trackEvent("add_to_cart", { currency: CURRENCY, value: item.price * quantity, items: [item] });
}

export function trackBeginCheckout(valueCents: number, items: AnalyticsItem[]): void {
  trackEvent("begin_checkout", { currency: CURRENCY, value: valueCents / 100, items });
}

export function trackSearch(searchTerm: string): void {
  trackEvent("search", { search_term: searchTerm });
}

/** Clic hacia afuera que lleva a una visita o consulta al local (WhatsApp, mapa, Instagram). */
export function trackContactClick(channel: "whatsapp" | "maps" | "instagram" | "email", location: string): void {
  trackEvent(channel === "whatsapp" ? "click_whatsapp" : `click_${channel}`, { link_location: location });
}

function readTrackedPurchases(): string[] {
  try {
    const raw = localStorage.getItem(PURCHASE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Evita contar dos veces la misma compra si el cliente recarga la confirmación. */
export function trackPurchase(params: {
  orderId: string;
  orderNumber: number;
  totalCents: number;
  shippingCents: number;
  items: AnalyticsItem[];
}): void {
  const tracked = readTrackedPurchases();
  if (tracked.includes(params.orderId)) return;

  trackEvent("purchase", {
    transaction_id: String(params.orderNumber),
    currency: CURRENCY,
    value: params.totalCents / 100,
    shipping: params.shippingCents / 100,
    items: params.items,
  });

  try {
    localStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify([...tracked, params.orderId].slice(-50)));
  } catch {
    // Sin localStorage el peor caso es un evento duplicado.
  }
}
