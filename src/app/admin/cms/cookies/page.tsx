"use client";

import { useEffect, useState } from "react";
import AdminListPage from "@/components/AdminListPage";
import { ApiError } from "@/lib/api";
import {
  cookieConsentStats,
  createCookiePolicy,
  listCookiePolicies,
  publishCookiePolicy,
  type CookiePolicyAdminSummary,
} from "@/lib/cms";
import { useLocale } from "@/i18n/LocaleContext";

function defaultPolicyPayload(version: string) {
  return {
    version,
    requires_reconsent: true,
    texts: {
      nl: {
        title: "Cookies",
        body: "We gebruiken cookies voor noodzakelijke functionaliteit en, met jouw toestemming, voor analyse en marketing.",
        accept_all: "Alles accepteren",
        reject_optional: "Alleen noodzakelijk",
        customize: "Aanpassen",
      },
      en: {
        title: "Cookies",
        body: "We use cookies for essential functionality and, with your consent, for analytics and marketing.",
        accept_all: "Accept all",
        reject_optional: "Reject optional",
        customize: "Customize",
      },
    },
    categories: [
      {
        key: "necessary",
        trackers: [
          {
            key: "session",
            name: "Session",
            provider: "ShopBonus",
            purpose_nl: "Inloggen en beveiliging",
            purpose_en: "Sign-in and security",
            retention: "Sessie",
          },
        ],
      },
      { key: "preferences", trackers: [] },
      {
        key: "analytics",
        trackers: [
          {
            key: "analytics_basic",
            name: "Analytics",
            provider: "ShopBonus",
            purpose_nl: "Gebruik meten",
            purpose_en: "Measure usage",
            retention: "13 maanden",
          },
        ],
      },
      { key: "marketing", trackers: [] },
    ],
  };
}

export default function AdminCookiesPage() {
  const { locale, dictionary: t } = useLocale();
  const [policies, setPolicies] = useState<CookiePolicyAdminSummary[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [version, setVersion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const list = await listCookiePolicies(locale);
      setPolicies(list);
      const s = await cookieConsentStats(undefined, locale);
      setStats(s.by_action ?? {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function onCreate() {
    if (!version.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createCookiePolicy(defaultPolicyPayload(version.trim()), locale);
      setVersion("");
      setMessage(locale === "en" ? "Draft policy created" : "Conceptbeleid aangemaakt");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function onPublish(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await publishCookiePolicy(id, locale);
      setMessage(locale === "en" ? "Policy published" : "Beleid gepubliceerd");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminListPage
      title={t.adminCookies}
      accent="cms"
      backHref="/admin/cms"
      subtitle={
        locale === "en"
          ? "Allowlisted trackers only. Publishing may require renewed consent."
          : "Alleen allowlisted trackers. Publiceren kan vernieuwde toestemming vragen."
      }
    >
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-3 text-sm text-green-700">{message}</p>}

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-blue-100 bg-mist/40 p-4">
        <input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="2026-10-30"
          className="rounded-xl border border-blue-100 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void onCreate()}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {locale === "en" ? "Create draft version" : "Conceptversie maken"}
        </button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {Object.entries(stats).map(([action, n]) => (
          <div key={action} className="rounded-2xl border border-blue-100 bg-white p-4">
            <p className="text-xs font-extrabold uppercase text-muted">{action}</p>
            <p className="mt-1 text-2xl font-black text-navy">{n}</p>
          </div>
        ))}
        {Object.keys(stats).length === 0 && (
          <p className="text-sm text-muted col-span-full">{t.empty}</p>
        )}
      </div>

      <ul className="divide-y divide-blue-50 rounded-2xl border border-blue-100 bg-white">
        {policies.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-extrabold text-navy">{p.version}</p>
              <p className="text-xs text-muted">
                {p.status}
                {p.requires_reconsent ? " · reconsent" : ""}
                {p.published_at ? ` · ${p.published_at}` : ""}
              </p>
            </div>
            {p.status === "draft" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onPublish(p.id)}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {t.cmsPublish}
              </button>
            )}
          </li>
        ))}
        {policies.length === 0 && <li className="px-4 py-8 text-center text-muted">{t.empty}</li>}
      </ul>
    </AdminListPage>
  );
}
