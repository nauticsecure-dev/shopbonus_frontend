"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  discoveryErrorMessage,
  fetchDiscoveryOffer,
  isDiscoveryAbort,
  type DiscoveryOfferDetail,
} from "@/lib/discovery";
import { voucherCopy } from "@/i18n/voucherCopy";
import { formatMinor } from "@/lib/money";
import { ApiError } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";

function discountLabel(offer: DiscoveryOfferDetail, t: (text: string) => string, intlLocale: string): string {
  if (offer.discount_type === "percentage" && offer.discount_value != null) {
    return `${Math.round(offer.discount_value / 100)}% ${t("korting")}`;
  }
  if (offer.discount_value != null) return `${formatMinor(offer.discount_value, "EUR", intlLocale)} ${t("korting")}`;
  return offer.title || t("Aanbieding");
}

function canObtain(availability: string): boolean {
  return availability === "available";
}

export default function OfferDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const { locale, intlLocale } = useLocale();
  const t = voucherCopy(locale);
  const money = (amount: number) => formatMinor(amount, "EUR", intlLocale);
  const { session, ready } = useSession();
  const { refreshVouchers, pushToast } = useShopBonus();
  const [offer, setOffer] = useState<DiscoveryOfferDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const ac = new AbortController();
    void Promise.resolve().then(() => {
      if (ac.signal.aborted) return;
      setLoading(true);
      setError(null);
      return fetchDiscoveryOffer(slug, ac.signal);
    })
      .then(detail => { if (!ac.signal.aborted && detail) setOffer(detail); })
      .catch((err) => {
        if (isDiscoveryAbort(err)) return;
        setError(discoveryErrorMessage(err));
        setOffer(null);
      })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [slug, locale]);

  async function obtain() {
    if (!offer || !canObtain(offer.availability) || !offer.slug) return;
    const offerSlug = offer.slug;
    const returnTo = `/aanbiedingen/${encodeURIComponent(offerSlug)}`;
    if (!session?.user) {
      router.push(`/account?mode=login&role=consumer&next=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (!session.user.email_verified) {
      router.push(`/account?mode=login&verify=1&next=${encodeURIComponent(returnTo)}`);
      return;
    }

    if (offer.how_to_obtain === "earn_with_purchase" && offer.webshop?.slug) {
      router.push(`/webshops/${encodeURIComponent(offer.webshop.slug)}`);
      return;
    }

    if (offer.how_to_obtain === "claim") {
      try {
        setBusy(true);
        const { apiRequest } = await import("@/lib/api");
        await apiRequest({
          path: `/api/v1/consumer/offers/${encodeURIComponent(offerSlug)}/claim`,
          method: "POST",
          locale,
        });
        await refreshVouchers("all");
        pushToast({ title: t("Geclaimd"), message: t("De voucher staat in Mijn voordelen."), kind: "success" });
        router.push("/mijn-voordelen");
      } catch (err) {
        pushToast({
          title: t("Claim mislukt"),
          message: err instanceof ApiError ? err.message : t("Probeer het later opnieuw."),
          kind: "error",
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    // Wallet / mixed Mollie purchase → dedicated checkout screen (no inventory mutation on view).
    router.push(`/afrekenen/${encodeURIComponent(offerSlug)}`);
  }

  if (loading || !ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="h-8 w-2/3 animate-pulse rounded bg-blue-100" />
        <div className="mt-6 h-40 animate-pulse rounded-3xl bg-blue-50" />
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-black text-navy">{t("Aanbieding niet beschikbaar")}</h1>
        <p className="mt-2 text-muted">{error || t("Deze aanbieding is niet (meer) gepubliceerd.")}</p>
        <Link href="/webshops" className="mt-6 inline-flex rounded-2xl bg-brand px-6 py-3 font-extrabold text-white"> {t("Ontdek webshops")} </Link>
      </div>
    );
  }

  const obtainable = canObtain(offer.availability);
  const availabilityLabel =
    offer.availability === "available"
      ? t("Beschikbaar")
      : offer.availability === "sold_out"
        ? t("Uitverkocht")
        : offer.availability === "expired"
          ? t("Verlopen")
          : offer.availability === "upcoming"
            ? t("Binnenkort")
            : offer.availability === "paused"
              ? t("Gepauzeerd")
              : offer.availability;
  const primaryLabel =
    !session?.user
      ? t("Inloggen om te verkrijgen")
      : offer.how_to_obtain === "earn_with_purchase"
        ? t("Bekijk webshop")
        : offer.how_to_obtain === "claim"
          ? t("Claim aanbieding")
          : (offer.price_points ?? 0) > 0 && (offer.price_minor ?? 0) <= 0
            ? t("Inwisselen met punten")
            : t("Naar checkout");

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
        <Link href="/webshops" className="hover:text-brand"> {t("Webshops")} </Link>
        {offer.webshop?.slug && (
          <>
            <span aria-hidden>/</span>
            <Link href={`/webshops/${offer.webshop.slug}`} className="hover:text-brand">
              {offer.webshop.name}
            </Link>
          </>
        )}
        <span aria-hidden>/</span>
        <span className="text-brand">{discountLabel(offer, t, intlLocale)}</span>
      </nav>

      <article className="mt-6 rounded-[1.75rem] bg-white p-7 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.22)] sm:p-10">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${
            obtainable ? "bg-mint text-mint-dark" : "bg-blue-50 text-muted"
          }`}
        >
          {availabilityLabel}
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-navy sm:text-4xl">
          {offer.title || discountLabel(offer, t, intlLocale)}
        </h1>
        {offer.webshop && (
          <p className="mt-2 text-sm font-bold text-brand"> {t("Bij")}{" "}
            <Link href={`/webshops/${offer.webshop.slug}`} className="underline-offset-2 hover:underline">
              {offer.webshop.name}
            </Link>
          </p>
        )}
        <p className="mt-4 leading-relaxed text-muted">
          {offer.description || offer.summary || t("Bekijk de voorwaarden hieronder.")}
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-mist p-4">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">{t("Korting")}</dt>
            <dd className="mt-1 text-lg font-extrabold text-navy">{discountLabel(offer, t, intlLocale)}</dd>
          </div>
          {offer.price_minor != null && offer.price_minor > 0 && (
            <div className="rounded-2xl bg-mist p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">{t("Benodigd tegoed")}</dt>
              <dd className="mt-1 text-lg font-extrabold text-navy">{money(offer.price_minor)}</dd>
            </div>
          )}
          {(offer.price_points ?? 0) > 0 && (
            <div className="rounded-2xl bg-mist p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">{t("Benodigde punten")}</dt>
              <dd className="mt-1 text-lg font-extrabold text-navy">{offer.price_points!.toLocaleString(intlLocale)} {t("punten")}</dd>
            </div>
          )}
          {offer.min_order_minor != null && offer.min_order_minor > 0 && (
            <div className="rounded-2xl bg-mist p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">{t("Minimale bestelling")}</dt>
              <dd className="mt-1 text-lg font-extrabold text-navy">{money(offer.min_order_minor)}</dd>
            </div>
          )}
          {offer.ends_at && (
            <div className="rounded-2xl bg-mist p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">{t("Geldig tot")}</dt>
              <dd className="mt-1 text-lg font-extrabold text-navy">
                {new Date(offer.ends_at).toLocaleDateString(intlLocale)}
              </dd>
            </div>
          )}
          {offer.redemption_validity_days != null && (
            <div className="rounded-2xl bg-mist p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">{t("Inwisselen")}</dt>
              <dd className="mt-1 text-lg font-extrabold text-navy">
                {offer.redemption_validity_days} {t("dagen na uitgifte")} </dd>
            </div>
          )}
          {offer.combinable != null && (
            <div className="rounded-2xl bg-mist p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">{t("Combineerbaar")}</dt>
              <dd className="mt-1 text-lg font-extrabold text-navy">{offer.combinable ? t("Ja") : t("Nee")}</dd>
            </div>
          )}
          {offer.max_discount_minor != null && offer.max_discount_minor > 0 && (
            <div className="rounded-2xl bg-mist p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">{t("Maximale korting")}</dt>
              <dd className="mt-1 text-lg font-extrabold text-navy">{money(offer.max_discount_minor)}</dd>
            </div>
          )}
        </dl>

        <section className="mt-8 rounded-2xl border border-blue-100 bg-mist/60 p-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-navy">{t("Voucher- en gebruiksvoorwaarden")}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            <li> {t("Beschikbaarheid:")} <strong className="text-navy">{availabilityLabel}</strong>
              {offer.terms_version != null ? ` · ${t("voorwaardenversie")} ${offer.terms_version}` : ""}.
            </li>
            {offer.how_to_obtain && (
              <li> {t("Verkrijgen via:")}{" "}
                <strong className="text-navy">
                  {offer.how_to_obtain === "claim"
                    ? t("claim (na verificatie)")
                    : offer.how_to_obtain === "buy_with_wallet"
                      ? t("inwisselen met beschikbaar tegoed")
                      : t("via aankoop / webshopactiviteit")}
                </strong>
                .
              </li>
            )}
            <li> {t("Gepauzeerde, verlopen, uitverkochte of ongepubliceerde aanbiedingen kunnen niet worden verkregen — ook niet via een bekende URL.")} </li>
            <li>{t("Het bekijken van deze pagina kent geen punten toe en geeft geen vouchercode uit.")}</li>
          </ul>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!obtainable || busy}
            onClick={() => void obtain()}
            className="rounded-2xl bg-brand px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.7)] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-blue-200 disabled:shadow-none"
          >
            {busy ? t("Bezig…") : obtainable ? primaryLabel : t("Niet beschikbaar")}
          </button>
          {offer.webshop?.slug && (
            <Link
              href={`/webshops/${offer.webshop.slug}`}
              className="rounded-2xl border border-blue-100 px-6 py-3.5 text-sm font-extrabold text-navy hover:bg-mist"
            > {t("Naar webshopprofiel")} </Link>
          )}
        </div>
      </article>
    </div>
  );
}
