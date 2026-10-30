import { apiRequest, ApiError } from "@/lib/api";

export type DiscoveryCategory = {
  key: string;
  label: { nl: string; en: string };
};

export type OfferKind = "cashback" | "discount_code" | "combined" | "voucher_purchase" | string;
export type OfferCtaHint = "shop_and_earn" | "view_code_and_shop" | "claim_both" | string;

export type DiscoveryOfferSummary = {
  slug: string | null;
  title: string;
  summary: string | null;
  how_to_obtain: string;
  offer_kind?: OfferKind;
  cta_hint?: OfferCtaHint;
  discount_type: string | null;
  discount_value: number | null;
  currency: string | null;
  min_order_minor: number | null;
  price_minor: number | null;
  ends_at: string | null;
  availability: "available" | "sold_out" | "expired" | "upcoming" | string;
  cashback_label?: string | null;
  benefit_label?: string | null;
  combinable?: boolean | null;
  consumer_cashback_rate?: number | null;
  source?: string | null;
  webshop?: { slug: string; name: string };
};

export type DiscoveryBenefit = {
  offer_kind: OfferKind;
  label?: string | null;
  benefit_label?: string | null;
  cashback_label?: string | null;
  cta_hint?: OfferCtaHint;
  slug?: string | null;
  source?: string | null;
  consumer_cashback_rate?: number | null;
};

export type DiscoveryWebshopCard = {
  slug: string;
  name: string;
  short_description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  categories: DiscoveryCategory[];
  offer_count?: number;
  active_offer_count?: number;
  featured_offer?: DiscoveryOfferSummary | null;
  /** Customer-facing cashback/discount badge from backend (never raw commission). */
  badge_label?: string | null;
  cashback_label?: string | null;
};

export type DiscoveryWebshopDetail = DiscoveryWebshopCard & {
  description: string | null;
  website_url: string | null;
  benefits?: DiscoveryBenefit[];
  offers: DiscoveryOfferSummary[];
};

export type DiscoverySort = "relevance" | "name" | "newest" | "most_offers";

export type PageMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type WebshopListParams = {
  search?: string;
  category?: string | null;
  sort?: DiscoverySort;
  page?: number;
  per_page?: number;
  has_offers?: boolean;
  signal?: AbortSignal;
};

type ListResponse = { data: DiscoveryWebshopCard[]; meta: PageMeta };
type Data<T> = { data: T };

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchDiscoveryCategories(signal?: AbortSignal): Promise<DiscoveryCategory[]> {
  const res = await apiRequest<Data<DiscoveryCategory[]>>({
    path: "/api/v1/public/categories",
    signal,
  });
  return res.data;
}

export async function fetchDiscoveryWebshops(params: WebshopListParams = {}): Promise<ListResponse> {
  const { signal, ...query } = params;
  return apiRequest<ListResponse>({
    path: `/api/v1/public/webshops${qs(query)}`,
    signal,
  });
}

export async function fetchDiscoveryWebshop(
  slug: string,
  signal?: AbortSignal
): Promise<DiscoveryWebshopDetail> {
  const res = await apiRequest<Data<DiscoveryWebshopDetail>>({
    path: `/api/v1/public/webshops/${encodeURIComponent(slug)}`,
    signal,
  });
  return res.data;
}

export type DiscoveryOfferDetail = DiscoveryOfferSummary & {
  description?: string | null;
  max_discount_minor?: number | null;
  starts_at?: string | null;
  redemption_validity_days?: number | null;
  categories?: string[];
  products?: string[];
  combinable?: boolean | null;
  terms_version?: number | null;
};

export async function fetchDiscoveryOffer(
  slug: string,
  signal?: AbortSignal
): Promise<DiscoveryOfferDetail> {
  const res = await apiRequest<Data<DiscoveryOfferDetail>>({
    path: `/api/v1/public/offers/${encodeURIComponent(slug)}`,
    signal,
  });
  return res.data;
}

export function offerCountLabel(count: number): string {
  return count === 1 ? "1 aanbieding" : `${count} aanbiedingen`;
}

/** Prefer backend badge; else format featured offer as customer-facing label. */
export function shopBadgeLabel(shop: DiscoveryWebshopCard): string | null {
  if (shop.badge_label) return shop.badge_label;
  if (shop.cashback_label) return shop.cashback_label;
  const offer = shop.featured_offer;
  if (!offer || offer.availability === "expired") return null;
  if (offer.discount_type === "percentage" && offer.discount_value != null) {
    const pct = offer.discount_value / 100;
    return Number.isInteger(pct) ? `${pct}% cashback` : `${pct.toFixed(1).replace(".", ",")}% cashback`;
  }
  if (offer.discount_type === "fixed" && offer.discount_value != null) {
    const euros = offer.discount_value / 100;
    return `€${euros.toLocaleString("nl-NL", { minimumFractionDigits: euros % 1 ? 2 : 0, maximumFractionDigits: 2 })} korting`;
  }
  const count = shop.active_offer_count ?? shop.offer_count ?? 0;
  if (count > 0) return offerCountLabel(count);
  return null;
}

export function categoryLabelNl(cat: DiscoveryCategory): string {
  return cat.label?.nl || cat.key;
}

export function isDiscoveryAbort(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

export function discoveryErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Je sessie is verlopen. Log opnieuw in.";
    if (err.status === 403) return "Je hebt geen toegang tot deze gegevens.";
    if (err.status === 404) return "Niet gevonden.";
    if (err.status === 429) return "Te veel verzoeken. Probeer het zo opnieuw.";
    if (err.status >= 500) return "Er ging iets mis op de server. Probeer het opnieuw.";
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Netwerkfout. Controleer je verbinding.";
}

/** Branded lifestyle covers when the API has no cover_url. */
export const CATEGORY_COVER_FALLBACKS: Record<string, string> = {
  home_living:
    "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop",
  fashion:
    "https://images.pexels.com/photos/5706273/pexels-photo-5706273.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop",
  electronics:
    "https://images.pexels.com/photos/4006158/pexels-photo-4006158.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop",
  beauty_health:
    "https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop",
  sports_outdoor:
    "https://images.pexels.com/photos/28271086/pexels-photo-28271086.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop",
  food_drinks:
    "https://images.pexels.com/photos/5824883/pexels-photo-5824883.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop",
};

export function resolveCoverUrl(shop: DiscoveryWebshopCard): string | null {
  if (shop.cover_url) return shop.cover_url;
  const key = shop.categories[0]?.key;
  return key ? CATEGORY_COVER_FALLBACKS[key] ?? null : null;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
