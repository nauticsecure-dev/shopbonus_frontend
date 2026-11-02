"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  discoveryErrorMessage,
  fetchDiscoveryWebshop,
  initialsFromName,
  isDiscoveryAbort,
  resolveCoverUrl,
  type DiscoveryOfferSummary,
  type DiscoveryWebshopDetail,
} from "@/lib/discovery";
import { formatMinor } from "@/lib/money";
import { apiUrl } from "@/config/env";
import { readStoredConsentId } from "@/lib/cookies";
import { useSession } from "@/store/SessionContext";
import { useLocale } from "@/i18n/LocaleContext";
import { apiRequest, ApiError } from "@/lib/api";

type OfferKind = "cashback" | "discount_code" | "combined" | "voucher_purchase" | string;

function discountTitle(offer: DiscoveryOfferSummary, en = false): string {
  if (offer.benefit_label && !en) return offer.benefit_label;
  if (offer.discount_type === "percentage" && offer.discount_value != null) {
    return `${Math.round(offer.discount_value / 100)}% ${en ? "discount" : "korting"}`;
  }
  if (offer.discount_type === "fixed" && offer.discount_value != null) {
    return `${formatMinor(offer.discount_value)} ${en ? "discount" : "korting"}`;
  }
  return offer.title || (en ? "Offer" : "Aanbieding");
}

function cardTitle(offer: DiscoveryOfferSummary, en = false): string {
  const kind = (offer.offer_kind || "") as OfferKind;
  if (kind === "cashback") {
    return (offer.cashback_label || offer.title || "Cashback").replace(/^Tot /, en ? "Up to " : "Tot ");
  }
  if (kind === "combined") {
    const discount = discountTitle(offer, en);
    const cashback = (offer.cashback_label || "cashback").replace(/^Tot /, en ? "Up to " : "Tot ");
    return `${discount} + ${cashback.replace(/^Tot\s+/i, "tot ")}`;
  }
  if (kind === "discount_code") {
    return discountTitle(offer, en);
  }
  return offer.title || discountTitle(offer, en);
}

function cardSummary(offer: DiscoveryOfferSummary, shopName: string, en = false): string {
  const kind = (offer.offer_kind || "") as OfferKind;
  if (en) return kind === "combined" ? "Reveal the code, then shop through ShopBonus to earn cashback under the advertiser’s terms." : kind === "cashback" ? `Shop at ${shopName} and earn wallet credit after approval and settlement.` : "Reveal the discount code and shop. Code conditions apply.";
  if (kind === "cashback") {
    return offer.summary || `Shop bij ${shopName} en verdien tegoed.`;
  }
  if (kind === "combined") {
    return (
      offer.summary ||
      `Gebruik de kortingscode én verdien cashback via de tracked ShopBonus-link (alleen als de adverteerder dit toestaat).`
    );
  }
  if (kind === "discount_code") {
    return offer.summary || "Bekijk de code en shop via de goedgekeurde link.";
  }
  return offer.summary || "";
}

function ctaLabel(offer: DiscoveryOfferSummary, en = false): string {
  switch (offer.cta_hint || offer.offer_kind) {
    case "shop_and_earn":
    case "cashback":
      return en ? "Shop & earn cashback" : "Shop & verdien cashback";
    case "claim_both":
    case "combined":
      return en ? "Get both benefits" : "Pak beide voordelen";
    case "view_code_and_shop":
    case "discount_code":
      return en ? "Reveal code & shop" : "Bekijk code & shop";
    default:
      return en ? "View offer" : "Bekijk aanbieding";
  }
}

function ticketGlyph(offer: DiscoveryOfferSummary): string {
  const kind = offer.offer_kind || "";
  if (kind === "cashback") return "%";
  if (kind === "combined") return "%";
  if (offer.discount_type === "fixed") return "€";
  return "%";
}

function isPrimaryBenefit(offer: DiscoveryOfferSummary): boolean {
  const kind = offer.offer_kind || "";
  return kind === "cashback" || kind === "discount_code" || kind === "combined";
}

export default function WebshopDetailPage() {
  const params = useParams<{ slug: string }>();
  return <WebshopDetail key={params.slug} slug={params.slug} />;
}

function subscribeConsent(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("shopbonus:consent-changed", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("shopbonus:consent-changed", listener);
  };
}

function WebshopDetail({ slug }: { slug: string }) {
  const { session, ready } = useSession();
  const router = useRouter();
  const { locale, intlLocale } = useLocale();
  const en = locale === "en";
  const pick = (nl: string, english: string) => en ? english : nl;
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [shop, setShop] = useState<DiscoveryWebshopDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverFailed, setCoverFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const consentId = useSyncExternalStore(subscribeConsent, readStoredConsentId, () => null);

  useEffect(() => {
    if (!slug) return;
    const ac = new AbortController();
    void fetchDiscoveryWebshop(slug, ac.signal)
      .then((data) => {
        setShop(data);
      })
      .catch((err) => {
        if (isDiscoveryAbort(err)) return;
        setError(discoveryErrorMessage(err));
        setShop(null);
      })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [slug]);

  const displayOffers = useMemo(() => {
    if (!shop) return [];
    const active = shop.offers.filter((o) => o.availability !== "expired");
    const primary = active.filter(isPrimaryBenefit);
    return primary.length > 0 ? primary : active.filter((o) => o.offer_kind !== "voucher_purchase");
  }, [shop]);

  async function reveal(offer: DiscoveryOfferSummary) {
    if (!offer.slug || offer.availability !== "available" || busy) return;
    const returnTo = "/webshops/" + encodeURIComponent(slug);
    if (!session?.user || !session.user.email_verified) {
      router.push(`/account?mode=login&role=consumer&${session?.user ? "verify=1&" : ""}next=${encodeURIComponent(returnTo)}`);
      return;
    }
    setBusy(offer.slug);
    setClaimError(null);
    try {
      const claim = await apiRequest<{data: {id: string}}>({ path: `/api/v1/consumer/offers/${encodeURIComponent(offer.slug)}/claim`, method: "POST", locale });
      const voucher = await apiRequest<{data: {code: string | null; can_copy_code: boolean}}>({ path: `/api/v1/consumer/vouchers/${encodeURIComponent(claim.data.id)}`, locale });
      if (!voucher.data.code || !voucher.data.can_copy_code) throw new Error("unusable_code");
      setRevealed(current => ({ ...current, [offer.slug!]: voucher.data.code! }));
    } catch (err) {
      setClaimError(err instanceof ApiError ? err.message : pick("Code kon niet worden getoond. Probeer opnieuw.", "The code could not be revealed. Please retry."));
    } finally { setBusy(null); }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-8 w-64 animate-pulse rounded bg-blue-100" />
        <div className="mt-6 h-56 animate-pulse rounded-[1.75rem] bg-blue-100" />
        <div className="mt-6 h-24 animate-pulse rounded-2xl bg-blue-50" />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-black text-navy">{pick("Webshop niet beschikbaar","Webshop unavailable")}</h1>
        <p className="mt-2 text-muted">
          {error || pick("Deze webshop is niet (meer) gepubliceerd of goedgekeurd voor discovery.", "This webshop is no longer published or approved.")}
        </p>
        <Link href="/webshops" className="mt-6 inline-flex rounded-2xl bg-brand px-6 py-3 font-extrabold text-white">
          {pick("Terug naar webshops","Back to webshops")}
        </Link>
      </div>
    );
  }

  const cover = resolveCoverUrl(shop);
  const cats = shop.categories.map(c => c.label[locale] || c.key);
  const offerCount = `${displayOffers.length} ${pick(displayOffers.length === 1 ? "aanbieding" : "aanbiedingen", displayOffers.length === 1 ? "offer" : "offers")}`;
  const visitBase = apiUrl(`/api/v1/public/webshops/${encodeURIComponent(shop.slug)}/visit`);
  const visitUrl =
    consentId == null
      ? visitBase
      : `${visitBase}${visitBase.includes("?") ? "&" : "?"}consent_id=${encodeURIComponent(consentId)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <nav className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Link href="/webshops" className="hover:text-brand">
          Webshops
        </Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {cats[0] && (
          <>
            <Link
              href={`/webshops?category=${encodeURIComponent(shop.categories[0].key)}`}
              className="hover:text-brand"
            >
              {cats[0]}
            </Link>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
        <span className="text-brand">{shop.name}</span>
      </nav>

      <div className="mt-4 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-brand-light to-mist shadow-[0_20px_50px_-20px_rgba(10,27,63,0.4)]">
        {cover && !coverFailed ? (
          <img
            src={cover}
            srcSet={cover.includes("/api/v1/public/webshops/") ? [640, 960, 1536].map(w => `${cover}${cover.includes("?") ? "&" : "?"}width=${w} ${w}w`).join(", ") : undefined}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 95vw, 1216px"
            alt=""
            className="h-56 w-full object-cover sm:h-72"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="grid h-56 place-items-center sm:h-72">
            <span className="text-5xl font-black text-brand/30">{initialsFromName(shop.name)}</span>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-5">
          {shop.logo_url && !logoFailed ? (
            <img
              src={shop.logo_url}
              alt={`${shop.name} logo`}
              onError={() => setLogoFailed(true)}
              className="h-24 w-24 shrink-0 rounded-full border-4 border-white object-cover shadow-md"
            />
          ) : (
            <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-brand text-2xl font-black text-white shadow-md">
              {initialsFromName(shop.name)}
            </span>
          )}
          <div>
            <h1 className="text-4xl font-black tracking-tight text-navy sm:text-5xl">{shop.name}</h1>
            <p className="mt-2 max-w-xl leading-relaxed text-muted">
              {shop.description || shop.short_description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {cats.map((t) => (
                <span key={t} className="rounded-full bg-brand-light px-4 py-1.5 text-[13px] font-bold text-navy">
                  {t}
                </span>
              ))}
              {shop.cashback_label && (
                <span className="rounded-full bg-mint px-4 py-1.5 text-[13px] font-extrabold text-mint-dark">
                  {shop.cashback_label.replace(/^Tot /, en ? "Up to " : "Tot ")}
                </span>
              )}
              <span className="rounded-full bg-mist px-4 py-1.5 text-[13px] font-extrabold text-navy">
                {offerCount}
              </span>
            </div>
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto">
          <a
            href={visitUrl}
            className="flex items-center justify-center gap-2.5 rounded-2xl bg-brand px-9 py-4 text-[16px] font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.7)] transition hover:bg-brand-dark"
          >
            {pick("Bezoek webshop","Visit webshop")}
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          {shop.website_url && (
            <a
              href={shop.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-sm font-bold text-brand hover:underline"
            >
              {pick("Officiële website →","Official website (no cashback tracking) →")}
            </a>
          )}
          {!session && (
            <Link
              href={`/account?mode=register&role=consumer&next=${encodeURIComponent(`/webshops/${shop.slug}`)}`}
              className="flex items-center justify-center rounded-2xl border border-blue-100 bg-white px-6 py-3.5 text-sm font-extrabold text-navy hover:bg-mist"
            >
              {pick("Account aanmaken","Create account")}
            </Link>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">{pick("Een bezoek via de officiële website registreert geen cashback. Gebruik de ShopBonus-knop en log in om cashback aan je account te koppelen.", "The official website link does not track cashback. Use the ShopBonus button and sign in to link cashback to your account.")}</p>
      <div className="mt-10">
        <h2 className="text-3xl font-black tracking-tight text-navy">
          {offerCount} {pick("beschikbaar", "available")}
        </h2>
        <p className="mt-1.5 text-muted">
          {pick(`Verdien ShopBonus-tegoed via aankopen bij ${shop.name} via de ShopBonus-link. Cashback wordt beschikbaar na goedkeuring én ontvangen netwerkbetaling.`, `Earn ShopBonus credit on purchases at ${shop.name} through the ShopBonus link. Cashback becomes available after approval and receipt of the network payment.`)}
        </p>
        {claimError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{claimError}</p>}
        {displayOffers.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-bold text-navy">{pick("Momenteel geen actieve cashback of kortingscodes.","No active cashback offers or discount codes.")}</p>
            <a href={visitUrl} className="mt-4 inline-flex font-extrabold text-brand hover:underline">
              Bezoek webshop →
            </a>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {displayOffers.map((offer, index) => {
              const href = visitUrl;
              const external = offer.offer_kind === "cashback";
              const key = offer.slug || `cashback-${index}`;
              const kind = offer.offer_kind || "cashback";

              return (
                <div
                  key={key}
                  className="relative overflow-hidden rounded-3xl bg-white shadow-[0_10px_36px_-16px_rgba(10,27,63,0.22)]"
                >
                  <div className="absolute bottom-16 right-0 top-0 hidden w-[104px] flex-col items-center justify-center bg-gradient-to-b from-[#2b94ff] to-[#0b63ee] sm:flex">
                    <div className="ticket-notch -top-[11px]" />
                    <div className="ticket-notch -bottom-[11px]" />
                    <div className="ticket-divider absolute bottom-2 left-0 top-2 w-[2px]" />
                    <span className="text-[56px] font-black leading-none text-white/95">{ticketGlyph(offer)}</span>
                  </div>

                  <div className="p-6 sm:pr-[128px]">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-1.5 text-[13px] font-extrabold text-mint-dark">
                      {kind === "cashback" && "Affiliate cashback"}
                      {kind === "discount_code" && pick("Kortingscode", "Discount code")}
                      {kind === "combined" && pick("Korting + cashback", "Discount + cashback")}
                      {!["cashback", "discount_code", "combined"].includes(kind) && pick("Aanbieding", "Offer")}
                    </span>
                    <h3 className="mt-3 text-[28px] font-black leading-tight tracking-tight text-navy sm:text-[32px]">
                      {cardTitle(offer, en)}
                    </h3>
                    <p className="mt-2 text-[15px] font-medium text-navy/80">{cardSummary(offer, shop.name, en)}</p>
                    {offer.ends_at && (
                      <p className="mt-2 text-xs font-semibold text-muted">
                        {pick("Geldig tot", "Valid until")} {new Date(offer.ends_at).toLocaleDateString(intlLocale)}
                      </p>
                    )}

                    {external ? (
                      <a
                        href={href}
                        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-brand px-5 py-3.5 text-[15px] font-extrabold text-white shadow-[0_12px_28px_-10px_rgba(11,116,255,0.7)] transition hover:bg-brand-dark"
                      >
                        {ctaLabel(offer, en)}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M5 12h14m-6-6 6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </a>
                    ) : revealed[offer.slug || ""] ? (
                      <div className="mt-5 space-y-3" aria-live="polite">
                        <code className="block break-all rounded-xl border border-blue-200 bg-white p-3 text-lg font-bold">{revealed[offer.slug!]}</code>
                        <button type="button" className="font-bold text-brand" onClick={async () => {
                          try { await navigator.clipboard.writeText(revealed[offer.slug!]); setCopied(offer.slug); }
                          catch { setClaimError(pick("Kopiëren mislukt. Selecteer de code handmatig.", "Copy failed. Select the code manually.")); }
                        }}>{copied === offer.slug ? pick("Gekopieerd", "Copied") : pick("Kopieer code", "Copy code")}</button>
                        <a href={visitUrl} className="flex w-full justify-center rounded-2xl bg-brand px-5 py-3.5 font-extrabold text-white">{pick("Shop met deze code →", "Shop with this code →")}</a>
                      </div>
                    ) : (
                      <button type="button" disabled={!ready || !!busy || offer.availability !== "available" || offer.how_to_obtain !== "claim"} onClick={() => void reveal(offer)}
                        className="mt-5 flex w-full items-center justify-center rounded-2xl bg-brand px-5 py-3.5 text-[15px] font-extrabold text-white disabled:opacity-50">
                        {busy === offer.slug ? pick("Code ophalen…", "Revealing…") : offer.availability !== "available" ? pick("Niet beschikbaar", "Unavailable") : ctaLabel(offer, en)}
                      </button>
                    )}

                    {offer.slug && (
                      <Link
                        href={`/aanbiedingen/${encodeURIComponent(offer.slug)}`}
                        className="mt-3.5 flex w-full items-center justify-center gap-2 text-sm font-bold text-brand hover:underline"
                      >
                        {pick("Bekijk voorwaarden →","View terms →")}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
