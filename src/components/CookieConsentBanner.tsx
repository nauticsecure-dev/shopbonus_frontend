"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import {
  analyticsAllowed,
  applyAllowedTrackers,
  fetchCookieConsent,
  fetchCookiePolicy,
  onCookieSettingsRequest,
  readStoredConsentId,
  recordCookieConsent,
  type CookiePolicy,
} from "@/lib/cookies";

/**
 * Cookie preferences banner. Optional analytics/marketing never load before consent.
 */
export default function CookieConsentBanner() {
  const { locale, dictionary: t } = useLocale();
  const [policy, setPolicy] = useState<CookiePolicy | null>(null);
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [choices, setChoices] = useState({ preferences: false, analytics: false, marketing: false });
  const [busy, setBusy] = useState(false);

  const categoryLabel = (key: string) => {
    if (key === "necessary") return t.cookieNecessary;
    if (key === "preferences") return t.cookiePreferences;
    if (key === "analytics") return t.cookieAnalytics;
    if (key === "marketing") return t.cookieMarketing;
    return key;
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const p = await fetchCookiePolicy(locale);
        if (cancelled) return;
        setPolicy(p);
        if (!p.version || !p.texts) {
          applyAllowedTrackers([]);
          return;
        }
        const existingId = readStoredConsentId();
        if (existingId) {
          try {
            const existing = await fetchCookieConsent(existingId, locale);
            if (cancelled) return;
            if (!existing.needs_renewal) {
              applyAllowedTrackers(existing.allowed_trackers ?? []);
              return;
            }
          } catch {
            /* show banner again */
          }
        }
        setOpen(true);
        applyAllowedTrackers([]);
      } catch {
        applyAllowedTrackers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    return onCookieSettingsRequest(() => {
      setOpen(true);
      setCustomize(true);
    });
  }, []);

  async function save(action: "accept_all" | "reject_optional" | "customize" | "withdraw") {
    if (!policy?.version || busy) return;
    setBusy(true);
    try {
      const record = await recordCookieConsent({
        consent_id: readStoredConsentId(),
        policy_version: policy.version,
        action,
        choices: action === "customize" ? choices : undefined,
        locale,
      });
      window.__shopbonusAnalyticsAllowed = analyticsAllowed(record.allowed_trackers);
      setOpen(false);
      setCustomize(false);
    } finally {
      setBusy(false);
    }
  }

  if (!open || !policy?.texts) return null;

  const texts = policy.texts;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-blue-100 bg-white p-4 shadow-[0_-12px_40px_-16px_rgba(10,27,63,0.35)] sm:p-6"
      data-testid="cookie-consent-banner"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 id="cookie-banner-title" className="text-lg font-extrabold text-navy">
            {texts.title}
          </h2>
          <p id="cookie-banner-body" className="mt-1 text-sm leading-relaxed text-muted">
            {texts.body}
          </p>
          {customize && (
            <fieldset className="mt-4 space-y-2" aria-label={texts.customize}>
              <label className="flex items-center gap-2 text-sm font-semibold text-navy">
                <input type="checkbox" checked disabled className="h-4 w-4 rounded border-blue-200 text-brand" />
                {t.cookieNecessary}
              </label>
              {(["preferences", "analytics", "marketing"] as const).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <input
                    type="checkbox"
                    checked={choices[key]}
                    onChange={(e) => setChoices((c) => ({ ...c, [key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-blue-200 text-brand focus:ring-brand"
                  />
                  {categoryLabel(key)}
                </label>
              ))}
            </fieldset>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save("reject_optional")}
            className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-bold text-navy hover:bg-mist disabled:opacity-60"
            data-testid="cookie-reject"
          >
            {texts.reject_optional}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => (customize ? void save("customize") : setCustomize(true))}
            className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-bold text-navy hover:bg-mist disabled:opacity-60"
            data-testid="cookie-customize"
          >
            {texts.customize}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save("accept_all")}
            className="rounded-2xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-60"
            data-testid="cookie-accept-all"
          >
            {texts.accept_all}
          </button>
          {customize && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void save("withdraw")}
              className="rounded-2xl px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
              data-testid="cookie-withdraw"
            >
              {locale === "en" ? "Withdraw" : "Intrekken"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
