"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { completeActivation, verifyActivation, type ActivationPreview, type ActivationResult } from "@/lib/activation";
import { ApiError } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";

export default function ClaimActivationPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { locale } = useLocale();
  const { session, ready } = useSession();
  const { refreshVouchers, pushToast } = useShopBonus();
  const [preview, setPreview] = useState<ActivationPreview | null>(null);
  const [result, setResult] = useState<ActivationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void verifyActivation(token, locale)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Deze uitnodiging is niet geldig.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  async function activate() {
    if (!token || busy) return;
    const returnTo = `/claim/${encodeURIComponent(token)}`;
    if (!session?.user) {
      router.push(`/account?mode=register&role=consumer&next=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (!session.user.email_verified) {
      router.push(`/account?mode=login&verify=1&next=${encodeURIComponent(returnTo)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await completeActivation(token, locale);
      setResult(data);
      await refreshVouchers("all");
      pushToast({ title: "Geactiveerd", message: "Je beloning staat klaar in Mijn voordelen.", kind: "success" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Activeren mislukt.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready && !preview && !error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="h-8 w-2/3 animate-pulse rounded bg-blue-100" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm font-extrabold uppercase tracking-wide text-brand">Gelukt</p>
        <h1 className="mt-2 text-3xl font-black text-navy">Beloning geactiveerd</h1>
        <p className="mt-3 text-muted">
          Je voucher bij <strong className="text-navy">{result.webshop.name}</strong> is gekoppeld aan je
          account.
        </p>
        {result.code && (
          <p className="mt-6 rounded-2xl bg-mist px-4 py-3 font-mono text-lg font-bold text-navy">{result.code}</p>
        )}
        <Link
          href={result.dashboard_path || "/mijn-voordelen"}
          className="mt-8 inline-flex rounded-2xl bg-brand px-6 py-3 font-extrabold text-white"
        >
          Naar Mijn voordelen
        </Link>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-black text-navy">Uitnodiging niet geldig</h1>
        <p className="mt-2 text-muted">{error}</p>
        <Link href="/" className="mt-6 inline-flex rounded-2xl bg-brand px-6 py-3 font-extrabold text-white">
          Naar homepage
        </Link>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="h-40 animate-pulse rounded-3xl bg-blue-50" />
      </div>
    );
  }

  const offer = preview.offer;
  const discount =
    offer.discount_type === "percentage" && offer.discount_value != null
      ? `${Math.round(offer.discount_value / 100)}%`
      : offer.discount_value != null
        ? formatMinor(offer.discount_value)
        : offer.name || "Korting";

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <p className="text-sm font-extrabold uppercase tracking-wide text-brand">Persoonlijke uitnodiging</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-navy">Activeer je ShopBonus-beloning</h1>
      <p className="mt-3 leading-relaxed text-muted">{preview.explanation}</p>

      <div className="mt-8 rounded-[1.75rem] bg-white p-6 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.22)]">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Webshop</p>
        <p className="mt-1 text-xl font-black text-navy">{preview.webshop.name}</p>
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">Aanbieding</p>
        <p className="mt-1 text-lg font-extrabold text-navy">
          {offer.name || discount}
          {offer.summary ? ` — ${offer.summary}` : ""}
        </p>
        {offer.min_order_minor != null && offer.min_order_minor > 0 && (
          <p className="mt-2 text-sm text-muted">Min. bestelling {formatMinor(offer.min_order_minor)}</p>
        )}
        <p className="mt-4 text-xs text-muted">
          Geldig tot {new Date(preview.expires_at).toLocaleString(locale === "en" ? "en-GB" : "nl-NL")}
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void activate()}
          className="rounded-2xl bg-brand px-6 py-3.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy
            ? "Bezig…"
            : session?.user
              ? "Activeer beloning"
              : "Inloggen of account aanmaken"}
        </button>
        <Link href="/" className="rounded-2xl border border-blue-100 px-6 py-3.5 text-sm font-extrabold text-navy">
          Later
        </Link>
      </div>
      <p className="mt-4 text-xs text-muted">
        Alleen openen van deze link maakt geen account aan en geeft geen voucher uit.
        {preview.requirements.email_matches_order
          ? " Gebruik het e-mailadres van je bestelling."
          : ""}
      </p>
    </div>
  );
}
