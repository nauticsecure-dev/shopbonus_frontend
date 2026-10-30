"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { ApiError } from "@/lib/api";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications";

const OPTIONAL_EVENTS: Array<{ key: string; titleNl: string; titleEn: string; descNl: string; descEn: string }> = [
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
    descNl: "Herinneringen vóór de vervaldatum.",
    descEn: "Reminders before expiry.",
  },
  {
    key: "favorite_merchant_offer",
    titleNl: "Favoriete webshops",
    titleEn: "Favorite webshops",
    descNl: "Optionele updates over nieuwe aanbiedingen van favorieten.",
    descEn: "Optional updates about new offers from favorites.",
  },
  {
    key: "support_reply",
    titleNl: "Supportantwoord",
    titleEn: "Support reply",
    descNl: "E-mail bij een nieuw menselijk supportantwoord.",
    descEn: "Email when a human support reply is available.",
  },
];

export default function NotificationPreferencesPanel() {
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
    void load().catch((err) => setError(err instanceof ApiError ? err.message : t.errorGeneric));
  }, [load, t.errorGeneric]);

  const toggleEmail = async (event: string) => {
    if (!prefs) return;
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
              ...(event === "favorite_merchant_offer"
                ? { in_app: current.in_app }
                : {}),
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
    if (!prefs) return;
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
    if (!prefs) return;
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
    <div id="notifications" className="rounded-[1.75rem] bg-white p-7 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.2)]">
      <h2 className="text-2xl font-black text-navy">{t.notifications}</h2>
      <p className="mt-1 text-muted">{t.notificationsStayInformedHint}</p>

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {notice && <p className="mt-4 text-sm font-semibold text-green-700">{notice}</p>}

      {!prefs && !error && <p className="mt-5 text-sm text-muted">{t.loading}</p>}

      {prefs && (
        <div className="mt-5 space-y-5">
          <button
            type="button"
            disabled={busy === "email_enabled" || !prefs.email_delivery_available}
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
                {locale === "en" ? "Email notifications" : "E-mailmeldingen"}
              </span>
              <span className="block text-[15px] text-muted">
                {prefs.email_delivery_available
                  ? locale === "en"
                    ? "Global switch for optional emails. Mandatory mail still sends."
                    : "Globale schakelaar voor optionele e-mails. Verplichte mail blijft."
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
            return (
              <button
                key={row.key}
                type="button"
                disabled={busy === row.key}
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
            );
          })}

          {prefs.preferences.favorite_merchant_offer && (
            <button
              type="button"
              disabled={busy === "favorite_in_app"}
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
