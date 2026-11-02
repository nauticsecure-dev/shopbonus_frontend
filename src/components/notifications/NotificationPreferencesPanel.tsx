"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { ApiError } from "@/lib/api";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications";

const OPTIONAL_EVENTS: Array<{
  key: string;
  titleNl: string;
  titleEn: string;
  descNl: string;
  descEn: string;
  /** Profile consent switch that also gates this event email. */
  requiresConsent?: "reminders" | "vouchers_discounts" | "offers_inspiration";
}> = [
  {
    key: "cashback_credited",
    titleNl: "Cashback bijgeschreven",
    titleEn: "Cashback credited",
    descNl: "E-mail wanneer tegoed op je wallet staat (in-app blijft aan).",
    descEn: "Email when credit lands in your wallet (in-app stays on).",
  },
  {
    key: "voucher_expiring",
    titleNl: "Voucher verloopt",
    titleEn: "Voucher expiring",
    descNl: "Kanaal voor vervalherinneringen. Vereist ook ‘Herinneringen’ hierboven.",
    descEn: "Channel for expiry reminders. Also requires Reminders consent above.",
    requiresConsent: "reminders",
  },
  {
    key: "favorite_merchant_offer",
    titleNl: "Favoriete webshops",
    titleEn: "Favorite webshops",
    descNl: "Optionele updates over nieuwe aanbiedingen van favorieten.",
    descEn: "Optional updates about new offers from favorites.",
    requiresConsent: "offers_inspiration",
  },
  {
    key: "support_reply",
    titleNl: "Supportantwoord",
    titleEn: "Support reply",
    descNl: "E-mail bij een nieuw menselijk supportantwoord.",
    descEn: "Email when a human support reply is available.",
  },
];

type ConsentFlags = {
  vouchers_discounts?: boolean;
  reminders?: boolean;
  offers_inspiration?: boolean;
};

export default function NotificationPreferencesPanel({
  consent,
  consentBusy = false,
}: {
  /** Marketing/reminder consent from `consumer/preferences` — gates effective delivery. */
  consent?: ConsentFlags | null;
  consentBusy?: boolean;
}) {
  const { locale, dictionary: t } = useLocale();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const data = await fetchNotificationPreferences(locale);
    setPrefs(data);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load().catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : t.errorGeneric);
      });
    });
    return () => { cancelled = true; };
  }, [load, t.errorGeneric]);

  const consentAllows = (key: (typeof OPTIONAL_EVENTS)[number]["requiresConsent"]): boolean => {
    if (!key) return true;
    if (!consent) return false;
    return Boolean(consent[key]);
  };

  const effectiveEmail = (event: string, requiresConsent?: (typeof OPTIONAL_EVENTS)[number]["requiresConsent"]) => {
    if (!prefs) return false;
    const current = prefs.preferences[event];
    if (!current?.email) return false;
    if (!prefs.email_enabled || !prefs.email_delivery_available) return false;
    return consentAllows(requiresConsent);
  };

  const toggleEmail = async (event: string) => {
    if (!prefs || busy) return;
    const current = prefs.preferences[event];
    if (!current) return;
    setBusy(event);
    setError(null);
    setNotice(null);
    try {
      const next = await updateNotificationPreferences(
        {
          preferences: {
            [event]: {
              email: !current.email,
              ...(event === "favorite_merchant_offer" ? { in_app: current.in_app } : {}),
            },
          },
        },
        locale
      );
      setPrefs(next);
      setNotice(t.languageSaved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(null);
    }
  };

  const toggleFavoriteInApp = async () => {
    if (!prefs || busy) return;
    const current = prefs.preferences.favorite_merchant_offer;
    if (!current) return;
    setBusy("favorite_in_app");
    setError(null);
    try {
      const next = await updateNotificationPreferences(
        { preferences: { favorite_merchant_offer: { in_app: !current.in_app, email: current.email } } },
        locale
      );
      setPrefs(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(null);
    }
  };

  const toggleGlobalEmail = async () => {
    if (!prefs || busy) return;
    setBusy("email_enabled");
    setError(null);
    try {
      const next = await updateNotificationPreferences({ email_enabled: !prefs.email_enabled }, locale);
      setPrefs(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div id="notification-channels" className="rounded-[1.75rem] bg-white p-7 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.2)]">
      <h2 className="text-2xl font-black text-navy">
        {locale === "en" ? "Delivery channels" : "Leveringskanalen"}
      </h2>
      <p className="mt-1 text-muted">
        {locale === "en"
          ? "Fine-tune optional event emails and in-app alerts. Marketing consent above still applies — both layers must allow a message before it is sent."
          : "Stel optionele gebeurtenismails en in-app meldingen bij. De toestemming hierboven blijft gelden — beide lagen moeten een bericht toestaan voordat het wordt verstuurd."}
      </p>

      {error && <div role="alert" className="mt-4 text-sm font-semibold text-red-600">
        <p>{error}</p>
        {!prefs && <button type="button" className="mt-2 underline" onClick={() => void load().catch((err) => setError(err instanceof ApiError ? err.message : t.errorGeneric))}>
          {locale === "en" ? "Try again" : "Opnieuw proberen"}
        </button>}
      </div>}
      {notice && <p className="mt-4 text-sm font-semibold text-green-700">{notice}</p>}

      {!prefs && !error && <p className="mt-5 text-sm text-muted">{t.loading}</p>}

      {prefs && (
        <div className="mt-5 space-y-5">
          <button
            type="button"
            disabled={busy !== null || !prefs.email_delivery_available}
            role="switch"
            aria-checked={prefs.email_enabled}
            onClick={() => void toggleGlobalEmail()}
            className="flex w-full items-start gap-3.5 text-left disabled:opacity-60"
          >
            <span
              className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg transition ${
                prefs.email_enabled ? "bg-brand text-white" : "border-2 border-slate-200 bg-white text-transparent"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>
              <span className="block font-extrabold text-navy">
                {locale === "en" ? "Optional email delivery" : "Optionele e-mailbezorging"}
              </span>
              <span className="block text-[15px] text-muted">
                {prefs.email_delivery_available
                  ? locale === "en"
                    ? "Master switch for optional event emails. Mandatory mail still sends."
                    : "Hoofdschakelaar voor optionele gebeurtenismails. Verplichte mail blijft."
                  : locale === "en"
                    ? "Email delivery is currently unavailable."
                    : "E-mailbezorging is momenteel niet beschikbaar."}
              </span>
            </span>
          </button>

          {OPTIONAL_EVENTS.map((row) => {
            const current = prefs.preferences[row.key];
            if (!current) return null;
            const on = current.email;
            const gated = !consentAllows(row.requiresConsent);
            const willSend = effectiveEmail(row.key, row.requiresConsent);
            return (
              <div key={row.key} className="space-y-1.5">
                <button
                  type="button"
                  disabled={busy !== null}
                  role="switch"
                  aria-checked={on}
                  onClick={() => void toggleEmail(row.key)}
                  className="flex w-full items-start gap-3.5 text-left disabled:opacity-60"
                >
                  <span
                    className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg transition ${
                      on ? "bg-brand text-white" : "border-2 border-slate-200 bg-white text-transparent"
                    }`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>
                    <span className="block font-extrabold text-navy">{locale === "en" ? row.titleEn : row.titleNl}</span>
                    <span className="block text-[15px] text-muted">{locale === "en" ? row.descEn : row.descNl}</span>
                  </span>
                </button>
                  <p role="status" className={`pl-10 text-xs font-semibold ${willSend ? "text-green-700" : "text-amber-700"}`}>
                    {consentBusy && row.requiresConsent
                      ? locale === "en" ? "Saving consent…" : "Toestemming opslaan…"
                      : !on
                        ? locale === "en" ? "Email off for this event." : "E-mail uit voor deze gebeurtenis."
                        : willSend
                      ? locale === "en"
                        ? "Effective: email can be delivered for this event."
                        : "Effectief: e-mail kan voor dit event worden bezorgd."
                      : gated
                        ? locale === "en"
                          ? "Blocked by consent above — enable the matching category first."
                          : "Geblokkeerd door toestemming hierboven — zet eerst de bijpassende categorie aan."
                        : locale === "en"
                          ? "Blocked by optional email delivery being off or unavailable."
                          : "Geblokkeerd omdat optionele e-mailbezorging uit of niet beschikbaar is."}
                  </p>
              </div>
            );
          })}

          {prefs.preferences.favorite_merchant_offer && (
            <button
              type="button"
              disabled={busy !== null}
              role="switch"
              aria-checked={prefs.preferences.favorite_merchant_offer.in_app}
              onClick={() => void toggleFavoriteInApp()}
              className="flex w-full items-start gap-3.5 text-left disabled:opacity-60"
            >
              <span
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg transition ${
                  prefs.preferences.favorite_merchant_offer.in_app
                    ? "bg-brand text-white"
                    : "border-2 border-slate-200 bg-white text-transparent"
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>
                <span className="block font-extrabold text-navy">
                  {locale === "en" ? "Favorite offers in-app" : "Favorieten in-app"}
                </span>
                <span className="block text-[15px] text-muted">
                  {locale === "en"
                    ? "Show optional favorite-store promotions in your inbox."
                    : "Toon optionele favorietenaanbiedingen in je inbox."}
                </span>
              </span>
            </button>
          )}
        </div>
      )}

      <p className="mt-5 text-xs text-muted">
        {locale === "en"
          ? "Account, security and mandatory transactional messages always send and cannot be disabled here."
          : "Account-, beveiligings- en verplichte transactionele berichten worden altijd verstuurd en kunnen hier niet worden uitgeschakeld."}
      </p>
    </div>
  );
}
