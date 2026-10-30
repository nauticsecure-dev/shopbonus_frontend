"use client";

import { useCallback, useEffect, useState } from "react";
import AdminListPage from "@/components/AdminListPage";
import AdminStepUpModal from "@/components/AdminStepUpModal";
import { fetchAnswer24Overview, retryAnswer24Message } from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";

export default function AdminAnswer24Page() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [retryId, setRetryId] = useState<string | null>(null);
  const [reason, setReason] = useState("Safe outbox retry after technical failure");
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetchAnswer24Overview();
      if (signal?.aborted) return;
      setData(res.data);
      setDefinitions(res.definitions ?? {});
      setError(null);
    } catch (err) {
      if (!signal?.aborted) setError(formatApiError(err, "Answer24 laden mislukt."));
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const contacts = (data?.contacts_by_status ?? {}) as Record<string, number>;
  const failedMessages = (data?.failed_messages ?? []) as Array<Record<string, unknown>>;
  const eligibility = (data?.eligibility_failures ?? {}) as Record<string, number>;

  return (
    <AdminListPage
      title="Answer24"
      accent="contact monitoring"
      backHref="/admin/integrations"
      subtitle="Eligible orders, contact statuses en failed dispatches. Geen override van ontbrekende marketingtoestemming."
    >
      {notice && <p className="mb-3 text-sm font-semibold text-green-700">{notice}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="text-sm text-muted">Laden…</p>}

      {data && (
        <div className="space-y-6">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-blue-50 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-bold text-muted">Dispatch enabled</dt>
              <dd className="font-extrabold text-navy">{data.dispatch_enabled ? "ja" : "nee"}</dd>
            </div>
            <div className="rounded-xl border border-blue-50 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-bold text-muted">Eligible paid orders</dt>
              <dd className="font-extrabold text-navy">{String(data.eligible_paid_orders ?? 0)}</dd>
            </div>
            <div className="rounded-xl border border-blue-50 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-bold text-muted">Failed dispatches</dt>
              <dd className="font-extrabold text-navy">{String(data.failed_dispatches ?? 0)}</dd>
            </div>
            <div className="rounded-xl border border-blue-50 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-bold text-muted">Failed contact results</dt>
              <dd className="font-extrabold text-navy">{String(data.failed_contact_results ?? 0)}</dd>
            </div>
          </dl>

          <section>
            <h3 className="mb-2 text-sm font-black text-navy">Contacts by status</h3>
            <ul className="flex flex-wrap gap-2 text-sm">
              {Object.entries(contacts).map(([k, v]) => (
                <li key={k} className="rounded-lg border border-blue-100 px-3 py-1.5 font-bold text-navy">
                  {k}: {v}
                </li>
              ))}
              {Object.keys(contacts).length === 0 && <li className="text-muted">Geen contacts.</li>}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-black text-navy">Eligibility / consent failures</h3>
            <ul className="text-sm text-muted">
              {Object.entries(eligibility).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
              {Object.keys(eligibility).length === 0 && <li>Geen failures.</li>}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-black text-navy">Failed outbox messages</h3>
            <label className="mb-2 block text-xs font-bold text-muted">
              Retry-reden
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-blue-100 px-3 py-1.5 text-sm"
              />
            </label>
            <ul className="divide-y divide-blue-50">
              {failedMessages.map((m) => (
                <li key={String(m.id)} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-bold text-navy">
                      {String(m.type)} · {String(m.id)}
                    </p>
                    <p className="text-xs text-muted">
                      attempts {String(m.attempts)} · {String(m.last_error ?? "")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl bg-brand px-3 py-1.5 text-xs font-extrabold text-white"
                    disabled={reason.trim().length < 5}
                    onClick={() => setRetryId(String(m.id))}
                  >
                    Safe retry
                  </button>
                </li>
              ))}
              {failedMessages.length === 0 && <li className="py-4 text-sm text-muted">Geen mislukte berichten.</li>}
            </ul>
          </section>

          {Object.keys(definitions).length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-black text-navy">Definities</h3>
              <ul className="space-y-1 text-xs text-muted">
                {Object.entries(definitions).map(([k, v]) => (
                  <li key={k}>
                    <strong className="text-navy">{k}:</strong> {v}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <AdminStepUpModal
        open={retryId !== null}
        title="Answer24 outbox retry"
        description="Idempotente retry — mag contact requests niet dupliceren."
        requireOtp
        onClose={() => setRetryId(null)}
        onReady={async () => {
          if (!retryId) return;
          await retryAnswer24Message(retryId, reason.trim());
          setNotice("Retry geaccepteerd.");
          setRetryId(null);
          await load();
        }}
      />
    </AdminListPage>
  );
}
