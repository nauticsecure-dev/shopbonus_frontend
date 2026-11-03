"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  discoveryErrorMessage,
  fetchDiscoveryOffer,
  isDiscoveryAbort,
  type DiscoveryOfferDetail,
} from "@/lib/discovery";
import { voucherCopy } from "@/i18n/voucherCopy";
import { formatMinor } from "@/lib/money";
import {
  newIdempotencyKey,
  quoteCheckout,
  startCheckout,
  type CheckoutQuote,
} from "@/lib/benefits";
import { ApiError } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";

const BLOCKER_COPY: Record<string, string> = {
  insufficient_points: "Je hebt onvoldoende beschikbare punten voor deze voucher.",
  not_for_sale: "Deze aanbieding is niet te koop met tegoed.",
  offer_not_active: "Deze aanbieding is gepauzeerd of niet meer actief.",
  webshop_not_active: "De webshop is momenteel niet beschikbaar.",
  outside_validity: "Deze aanbieding is verlopen of nog niet gestart.",
  sold_out: "Alle vouchercodes zijn uitverkocht. Probeer later opnieuw.",
  payments_unavailable:
    "Je tegoed is ontoereikend en een bijbetaling via Mollie is nu niet beschikbaar.",
  email_not_verified: "Bevestig eerst je e-mailadres om verder te gaan.",
};

function discountLabel(offer: DiscoveryOfferDetail, t: (text: string) => string, intlLocale: string): string {
  if (offer.discount_type === "percentage" && offer.discount_value != null) {
    return `${Math.round(offer.discount_value / 100)}% ${t("korting")}`;
  }
  if (offer.discount_value != null) return `${formatMinor(offer.discount_value, "EUR", intlLocale)} ${t("korting")}`;
  return offer.title || t("Aanbieding");
}

function blockerMessages(blockers: string[], t: (text: string) => string): string[] {
  return blockers.map((b) => t(BLOCKER_COPY[b] ?? b));
}

export default function VoucherCheckoutPage() {
  const params = useParams<{ slug: string }>();
  return <VoucherCheckout key={params.slug} slug={params.slug} />;
}

function VoucherCheckout({ slug }: { slug: string }) {
  const router = useRouter();
  const { locale, intlLocale } = useLocale();
  const t = voucherCopy(locale);
  const money = (amount: number) => formatMinor(amount, "EUR", intlLocale);
  const { session, ready } = useSession();
  const { refreshWallet, refreshVouchers, pushToast } = useShopBonus();

  const [offer, setOffer] = useState<DiscoveryOfferDetail | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<"eur_credit" | "points" | null>(null);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const idempotencyKey = useRef(newIdempotencyKey());

  const returnTo = slug ? `/afrekenen/${encodeURIComponent(slug)}` : "/webshops";

  useEffect(() => {
    if (!ready) return;
    if (!session?.user) {
      router.replace(`/account?mode=register&role=consumer&next=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (!session.user.email_verified) {
      router.replace(`/account?mode=login&verify=1&next=${encodeURIComponent(returnTo)}`);
    }
  }, [ready, session, router, returnTo]);

  useEffect(() => {
    if (!slug || !session?.user?.email_verified) return;
    const ac = new AbortController();
    void Promise.resolve().then(async () => {
      if (ac.signal.aborted) return;
      setLoading(true);
      setQuote(null);
      setError(null);
      try {
        const detail = await fetchDiscoveryOffer(slug, ac.signal);
        setOffer(detail);
        if (detail.how_to_obtain !== "buy_with_wallet" || ((detail.price_minor ?? 0) <= 0 && (detail.price_points ?? 0) <= 0)) {
          router.replace(`/aanbiedingen/${encodeURIComponent(slug)}`);
          return;
        }
        const unit = selectedUnit ?? ((detail.price_minor ?? 0) > 0 ? "eur_credit" : "points");
        const q = await quoteCheckout(slug, true, locale, unit);
        if (ac.signal.aborted) return;
        setQuote(q);
      } catch (err) {
        if (ac.signal.aborted || isDiscoveryAbort(err)) return;
        setError(err instanceof ApiError ? err.message : discoveryErrorMessage(err));
        setOffer(null);
        setQuote(null);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    });

    return () => ac.abort();
  }, [slug, session?.user?.email_verified, locale, router, selectedUnit]);

  const blockers = quote?.blockers ?? [];
  const points = quote?.wallet_unit === "points";
  const displayAmount = (amount: number) => points ? `${amount.toLocaleString(intlLocale)} ${t("punten")}` : money(amount);
  const shortfall = points ? (quote?.shortfall_points ?? 0) : quote?.shortfall_minor ?? Math.max(0, (quote?.price_minor ?? 0) - (quote?.wallet_available ?? 0));
  const canPurchase = !!offer && !!quote && acceptedTerms && !busy &&
    (!offer.availability || offer.availability === "available") && blockers.length === 0;

  async function confirmPurchase() {
    if (!offer?.slug || !canPurchase) return;
    try {
      setBusy(true);
      const checkout = await startCheckout(offer.slug, idempotencyKey.current, true, locale, quote?.wallet_unit ?? "eur_credit");
      await refreshWallet();
      await refreshVouchers("all");

      if (checkout.state === "completed") {
        pushToast({ title: t("Gelukt"), message: t("Je voucher staat klaar in Mijn vouchers."), kind: "success" });
        router.push(
          checkout.voucher_id
            ? `/mijn-voordelen?voucher=${encodeURIComponent(checkout.voucher_id)}`
            : "/mijn-voordelen"
        );
        return;
      }

      if (checkout.payment?.checkout_url) {
        // Hosted Mollie flow — return lands on /checkout/{id}.
        window.location.assign(checkout.payment.checkout_url);
        return;
      }

      if (checkout.state === "pending_payment") {
        router.push(`/checkout/${encodeURIComponent(checkout.id)}`);
        return;
      }

      pushToast({
        title: t("Checkout mislukt"),
        message: checkout.failure_reason ?? t("Kon niet worden afgerond."),
        kind: "error",
      });
      idempotencyKey.current = newIdempotencyKey();
    } catch (err) {
      pushToast({
        title: t("Aankoop mislukt"),
        message: err instanceof ApiError ? err.message : t("Probeer het later opnieuw."),
        kind: "error",
      });
      // New key only on hard failure so retries stay idempotent for network blips.
      if (!(err instanceof ApiError) || err.status >= 500) {
        /* keep key */
      } else if (err.status === 409) {
        /* keep key — may return existing success */
      } else {
        idempotencyKey.current = newIdempotencyKey();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!ready || loading || (session?.user && !session.user.email_verified)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="h-8 w-2/3 animate-pulse rounded bg-blue-100" />
        <div className="mt-6 h-64 animate-pulse rounded-3xl bg-blue-50" />
      </div>
    );
  }

  if (error || !offer || !quote) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-black text-navy">{t("Checkout niet beschikbaar")}</h1>
        <p className="mt-2 text-muted">{error || t("Deze aanbieding kan nu niet worden afgerekend.")}</p>
        <Link href="/webshops" className="mt-6 inline-flex rounded-2xl bg-brand px-6 py-3 font-extrabold text-white"> {t("Ontdek webshops")} </Link>
      </div>
    );
  }

  const validityDays = quote.validity_days ?? offer.redemption_validity_days;
  const messages = blockerMessages(blockers, t);
  const unavailable =
    offer.availability === "sold_out" ||
    offer.availability === "expired" ||
    offer.availability === "paused" ||
    offer.availability === "upcoming";

  return (
    <div className="relative overflow-hidden">
      <div className="page-blob left-[-80px] top-[-40px] h-72 w-72 bg-blue-200/45" />
      <div className="page-blob right-[-120px] top-[80px] h-96 w-96 bg-sky-100" />

      <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
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
          <Link href={`/aanbiedingen/${encodeURIComponent(offer.slug ?? slug)}`} className="hover:text-brand"> {t("Aanbieding")} </Link>
          <span aria-hidden>/</span>
          <span className="text-brand">{t("Afrekenen")}</span>
        </nav>

        <header className="mt-6 flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100 to-blue-200 text-xl font-black text-navy shadow-sm">
            {(offer.webshop?.name?.[0] ?? "S").toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-brand">{offer.webshop?.name ?? t("Webshop")}</p>
            <h1 className="text-3xl font-black tracking-tight text-navy sm:text-4xl">{t("Voucher afrekenen")}</h1>
            <p className="mt-1 text-muted"> {t("Bekijken of terugkeren trekt geen tegoed af en geeft geen code uit.")} </p>
          </div>
        </header>

        {(messages.length > 0 || unavailable) && (
          <div
            className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
            role="alert"
          >
            {unavailable && offer.availability === "sold_out" && (
              <p>{t("Deze voucher is uitverkocht. Kies een andere aanbieding of kom later terug.")}</p>
            )}
            {unavailable && offer.availability === "expired" && (
              <p>{t("Deze aanbieding is verlopen en kan niet meer worden gekocht.")}</p>
            )}
            {unavailable && offer.availability === "paused" && (
              <p>{t("Deze aanbieding is gepauzeerd. Probeer later opnieuw.")}</p>
            )}
            {unavailable && offer.availability === "upcoming" && (
              <p>{t("Deze aanbieding is nog niet gestart.")}</p>
            )}
            {messages.map((m) => (
              <p key={m} className="mt-1 first:mt-0">
                {m}
              </p>
            ))}
            {shortfall > 0 && blockers.includes("payments_unavailable") && (
              <p className="mt-2"> {t("Tekort:")} {displayAmount(shortfall)}{t(". Verdien meer tegoed of probeer later wanneer betalen beschikbaar is.")} </p>
            )}
          </div>
        )}

        {!points && shortfall > 0 && quote.payment_part_minor > 0 && !blockers.includes("payments_unavailable") && (
          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-navy"> {t("Je tegoed dekt")} {displayAmount(points ? (quote.wallet_part_points ?? 0) : quote.wallet_part_minor)}{t(". Het restant van")}{" "}
            {money(quote.payment_part_minor)} {t("betaal je veilig via Mollie.")} </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[1.75rem] bg-white p-6 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.22)] sm:p-8">
            <h2 className="text-lg font-black text-navy">{t("Geselecteerde aanbieding")}</h2>
            <p className="mt-2 text-2xl font-black text-brand">{discountLabel(offer, t, intlLocale)}</p>
            <p className="mt-2 text-sm text-muted">{offer.summary || offer.description || offer.title}</p>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-mist p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-muted">{t("Minimale bestelling")}</dt>
                <dd className="mt-1 font-extrabold text-navy">
                  {offer.min_order_minor != null && offer.min_order_minor > 0
                    ? money(offer.min_order_minor)
                    : t("Geen minimum")}
                </dd>
              </div>
              <div className="rounded-2xl bg-mist p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-muted">{t("Geldigheid")}</dt>
                <dd className="mt-1 font-extrabold text-navy">
                  {validityDays != null ? `${validityDays} ${t("dagen na uitgifte")}` : t("Zie voorwaarden")}
                </dd>
              </div>
              {offer.max_discount_minor != null && offer.max_discount_minor > 0 && (
                <div className="rounded-2xl bg-mist p-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-muted">{t("Max. korting")}</dt>
                  <dd className="mt-1 font-extrabold text-navy">{money(offer.max_discount_minor)}</dd>
                </div>
              )}
              {offer.combinable != null && (
                <div className="rounded-2xl bg-mist p-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-muted">{t("Combineerbaar")}</dt>
                  <dd className="mt-1 font-extrabold text-navy">{offer.combinable ? t("Ja") : t("Nee")}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-muted">
              <p className="font-bold text-navy">{t("Voorwaarden")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>{t("Geen cashopnames of uitbetalingen in geld.")}</li>
                <li>{t("De vouchercode wordt pas uitgegeven na een geslaagde aankoop.")}</li>
                <li>{t("Historische voorwaarden blijven gelden na uitgifte.")}</li>
                {offer.ends_at && (
                  <li> {t("Aanbieding zichtbaar tot")}{" "}
                    {new Date(offer.ends_at).toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL")}.
                  </li>
                )}
              </ul>
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-navy">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-blue-200 text-brand focus:ring-brand"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span> {t("Ik ga akkoord met de toepasselijke voorwaarden en begrijp dat tegoed niet wordt terugbetaald als cash.")} </span>
            </label>
          </article>

          <aside className="h-fit rounded-[1.75rem] bg-white p-6 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.22)] sm:p-7">
            <h2 className="text-lg font-black text-navy">{t("Ordersamenvatting")}</h2>
            {(offer.price_minor ?? 0) > 0 && (offer.price_points ?? 0) > 0 && (
              <label className="mt-4 block text-sm font-bold text-navy"> {t("Betalen met")} <select className="mt-2 w-full rounded-xl border p-2" value={points ? "points" : "eur_credit"} disabled={busy}
                  onChange={(e) => { setSelectedUnit(e.target.value as "eur_credit" | "points"); setQuote(null); setAcceptedTerms(false); idempotencyKey.current = newIdempotencyKey(); }}>
                  <option value="eur_credit">{t("EUR-tegoed")}</option>
                  <option value="points">{t("Punten")}</option>
                </select>
              </label>
            )}
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t(points ? "Prijs (punten)" : "Prijs (tegoed)")}</dt>
                <dd className="font-extrabold text-navy">{displayAmount(points ? (quote.price_points ?? 0) : quote.price_minor)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t(points ? "Beschikbare punten" : "Beschikbaar tegoed")}</dt>
                <dd className="font-extrabold text-navy">{displayAmount(points ? (quote.wallet_available_points ?? 0) : quote.wallet_available)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t(points ? "Van punten" : "Van tegoed")}</dt>
                <dd className="font-extrabold text-navy">{displayAmount(points ? (quote.wallet_part_points ?? 0) : quote.wallet_part_minor)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{points ? t("Bijbetaling") : t("Bijbetaling (Mollie)")}</dt>
                <dd className="font-extrabold text-navy">
                  {quote.payment_part_minor > 0 ? money(quote.payment_part_minor) : points ? t("Niet beschikbaar") : money(0)}
                </dd>
              </div>
              {shortfall > 0 && quote.payment_part_minor === 0 && (
                <div className="flex justify-between gap-3 text-amber-800">
                  <dt>{t("Tekort")}</dt>
                  <dd className="font-extrabold">{displayAmount(shortfall)}</dd>
                </div>
              )}
            </dl>

            <button
              type="button"
              disabled={!canPurchase}
              onClick={() => void confirmPurchase()}
              className="mt-6 w-full rounded-2xl bg-brand py-3.5 text-sm font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.7)] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-blue-200 disabled:shadow-none"
            >
              {busy
                ? t("Bezig…")
                : quote.payment_part_minor > 0
                  ? t("Bevestigen & betalen")
                  : t("Voucher ophalen")}
            </button>

            <Link
              href={`/aanbiedingen/${encodeURIComponent(offer.slug ?? slug)}`}
              className="mt-3 block w-full rounded-2xl border border-blue-100 py-3 text-center text-sm font-extrabold text-navy hover:bg-mist"
            > {t("Terug")} </Link>

            <p className="mt-4 text-xs leading-relaxed text-muted"> {t("Codes worden nooit in deze checkout getoond. Na succes vind je ze in")}{" "}
              <Link href="/mijn-voordelen" className="font-bold text-brand hover:underline"> {t("Mijn vouchers")} </Link> {t(". Een Mollie-redirect bewijst geen betaling — we verifiëren server-side.")} </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
