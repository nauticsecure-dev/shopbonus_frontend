"use client";

import { useCallback, useEffect, useState } from "react";
import AdminListPage from "@/components/AdminListPage";
import AdminStepUpModal from "@/components/AdminStepUpModal";
import {
  createPlatformSettingDraft,
  fetchPlatformSettings,
  publishPlatformSetting,
  rollbackPlatformSetting,
  submitPlatformSetting,
} from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";

export default function AdminSettingsPage() {
  const [versions, setVersions] = useState<Array<Record<string, unknown>>>([]);
  const [published, setPublished] = useState<Record<string, unknown> | null>(null);
  const [allowedKeys, setAllowedKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [valueJson, setValueJson] = useState("{}");
  const [reason, setReason] = useState("");
  const [stepUp, setStepUp] = useState<{ kind: "publish" | "rollback"; id: string } | null>(null);
  const [actionNote, setActionNote] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetchPlatformSettings();
      if (signal?.aborted) return;
      setVersions(res.data);
      setPublished(res.published ?? null);
      setAllowedKeys(res.allowed_keys ?? []);
      if (!key && res.allowed_keys?.[0]) setKey(res.allowed_keys[0]);
      setError(null);
    } catch (err) {
      if (!signal?.aborted) setError(formatApiError(err, "Instellingen laden mislukt."));
    }
  }, [key]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const createDraft = async () => {
    setError(null);
    try {
      const value = JSON.parse(valueJson) as unknown;
      if (reason.trim().length < 5) throw new Error("Reason minstens 5 tekens.");
      await createPlatformSettingDraft({ key, value, reason: reason.trim() });
      setNotice("Draft aangemaakt.");
      setReason("");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Draft maken mislukt (controleer JSON)."));
    }
  };

  const submitReview = async (id: string) => {
    try {
      await submitPlatformSetting(id);
      setNotice("Ingezonden voor review.");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Review indienen mislukt."));
    }
  };

  return (
    <AdminListPage
      title="Instellingen"
      accent="platform"
      subtitle="Draft → Review → Publish. Wijzigingen herschrijven geen historische transacties of voucherterms."
    >
      <p className="mb-4 text-sm text-muted">
        CMS, vertalingen en agreements blijven in{" "}
        <a href="/admin/cms" className="font-extrabold text-brand">
          Content Studio
        </a>
        .
      </p>

      {notice && <p className="mb-3 text-sm font-semibold text-green-700">{notice}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {published && (
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-black text-navy">Published (huidig)</h3>
          <pre className="max-h-40 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-navy">
            {JSON.stringify(published, null, 2)}
          </pre>
        </section>
      )}

      <section className="mb-6 space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
        <h3 className="text-sm font-black text-navy">Nieuwe draft</h3>
        <label className="block text-xs font-bold text-muted">
          Key
          <select
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm"
          >
            {allowedKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-muted">
          Value (JSON)
          <textarea
            value={valueJson}
            onChange={(e) => setValueJson(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 font-mono text-xs"
          />
        </label>
        <label className="block text-xs font-bold text-muted">
          Reason
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void createDraft()}
          className="rounded-xl bg-brand px-3 py-2 text-sm font-extrabold text-white"
        >
          Draft opslaan
        </button>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-black text-navy">Versies</h3>
        <ul className="divide-y divide-blue-50">
          {versions.map((v) => (
            <li key={String(v.id)} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-extrabold text-navy">
                  {String(v.key)} v{String(v.version)} · {String(v.status)}
                  {v.is_current ? " · CURRENT" : ""}
                </p>
                <p className="text-xs text-muted">{String(v.reason ?? "")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {v.status === "draft" && (
                  <button
                    type="button"
                    className="text-xs font-extrabold text-brand"
                    onClick={() => void submitReview(String(v.id))}
                  >
                    Submit review
                  </button>
                )}
                {(v.status === "in_review" || v.status === "reviewed") && (
                  <button
                    type="button"
                    className="text-xs font-extrabold text-green-700"
                    onClick={() => {
                      setActionNote("Published after review");
                      setStepUp({ kind: "publish", id: String(v.id) });
                    }}
                  >
                    Publish
                  </button>
                )}
                {Boolean(v.is_current) && (
                  <button
                    type="button"
                    className="text-xs font-extrabold text-amber-700"
                    onClick={() => {
                      setActionNote("Rollback to previous published version");
                      setStepUp({ kind: "rollback", id: String(v.id) });
                    }}
                  >
                    Rollback
                  </button>
                )}
              </div>
            </li>
          ))}
          {versions.length === 0 && <li className="py-4 text-sm text-muted">Nog geen versies.</li>}
        </ul>
      </section>

      <AdminStepUpModal
        open={stepUp !== null}
        title={stepUp?.kind === "publish" ? "Setting publiceren" : "Setting rollback"}
        description="Wachtwoord + e-mail OTP. Volledige auditgeschiedenis blijft behouden."
        requireOtp
        onClose={() => setStepUp(null)}
        onReady={async () => {
          if (!stepUp) return;
          if (actionNote.trim().length < 5) throw new Error("Note/reason minstens 5 tekens.");
          if (stepUp.kind === "publish") {
            await publishPlatformSetting(stepUp.id, actionNote.trim());
            setNotice("Gepubliceerd.");
          } else {
            await rollbackPlatformSetting(stepUp.id, actionNote.trim());
            setNotice("Rollback uitgevoerd.");
          }
          await load();
        }}
      />
    </AdminListPage>
  );
}
