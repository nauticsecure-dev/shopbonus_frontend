"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import AdminStepUpModal from "@/components/AdminStepUpModal";
import {
  fetchFailedIntegrationEvents,
  fetchAffiliateConnections,
  fetchIntegrations,
  retryIntegrationEvent,
} from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";

function IntegrationsOps() {
  const params = useSearchParams();
  const status = params.get("status") || "";
  const attention = params.get("attention") || undefined;
  const [affiliateFailures, setAffiliateFailures] = useState<Array<Record<string, unknown>>>([]);
  const connectionFilter = params.get("connection") || "";
  const webshopFilter = params.get("webshop") || "";
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [failed, setFailed] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryId, setRetryId] = useState<string | null>(null);
  const [retryReason, setRetryReason] = useState("Safe technical retry after investigation");
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [conn, events, affiliates] = await Promise.all([
        fetchIntegrations(50, connectionFilter || undefined, attention),
        fetchFailedIntegrationEvents(50, connectionFilter || undefined),
        fetchAffiliateConnections(),
      ]);
      if (signal?.aborted) return;
      let list = conn.data;
      if (connectionFilter) list = list.filter((r) => r.id === connectionFilter);
      if (status) list = list.filter((r) => String(r.status) === status);
      if (webshopFilter) {
        list = list.filter((r) => {
          const shop = r.webshop as { id?: string } | undefined;
          return shop?.id === webshopFilter;
        });
      }
      setAffiliateFailures(affiliates.data.filter((c) => ["error", "reauthentication_required", "auth_failed", "rate_limited", "unavailable"].includes(String(c.status))));
      setRows(list);
      setFailed(events.data);
      setError(null);
    } catch (err) {
      if (!signal?.aborted) setError(formatApiError(err, "Integraties laden mislukt."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [status, webshopFilter, connectionFilter, attention]);

  useEffect(() => {
    const ac = new AbortController();
    const timer = window.setTimeout(() => void load(ac.signal), 0);
    return () => { window.clearTimeout(timer); ac.abort(); };
  }, [load]);

  return (
    <AdminListPage
      title="Operations"
      accent="integraties"
      subtitle="Connectiestatus, mislukte events en idempotente retries. Answer24: aparte pagina."
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/answer24" className="font-extrabold text-brand">
          Answer24 monitoring →
        </Link>
        <Link href="/admin/incidents" className="font-extrabold text-brand">
          Incidenten →
        </Link>
      </div>

      {notice && <p className="mb-3 text-sm font-semibold text-green-700">{notice}</p>}
      {loading && <p className="text-sm text-muted">Laden…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          {affiliateFailures.map((c) => <p key={String(c.id)} className="mb-3"><Link className="font-bold text-brand" href={`/admin/affiliate?tab=connections&connection=${c.id}`}>Affiliate · {String(c.network)} · {String(c.status)} →</Link></p>)}
          <h3 className="mb-2 text-sm font-black text-navy">Connecties</h3>
          <ul className="mb-6 divide-y divide-blue-50">
            {rows.map((row) => {
              const shop = row.webshop as { id?: string; name?: string } | undefined;
              return (
                <li key={String(row.id)} className="py-3">
                  <p className="font-extrabold text-navy">
                    {shop?.name ?? String(row.id)} · {String(row.platform)}
                  </p>
                  <p className="text-xs text-muted">
                    {String(row.status)}
                    {row.auth_error ? ` · auth ${String(row.auth_error)}` : ""}
                    {row.last_error_code ? ` · ${String(row.last_error_code)}` : ""}
                    {" · "}orders vandaag {String(row.orders_today ?? 0)}
                    {" · "}failed {String(row.failed_events ?? 0)}
                    {row.required_action ? ` · actie: ${String(row.required_action)}` : ""}
                  </p>
                  {row.last_successful_event_at ? (
                    <p className="text-xs text-muted">
                      Laatste succes: {new Date(String(row.last_successful_event_at)).toLocaleString()}
                    </p>
                  ) : null}
                </li>
              );
            })}
            {rows.length === 0 && <li className="py-4 text-sm text-muted">Geen connecties.</li>}
          </ul>

          <h3 className="mb-2 text-sm font-black text-navy">Mislukte webhook events</h3>
          <label className="mb-2 block text-xs font-bold text-muted">
            Retry-reden
            <input
              value={retryReason}
              onChange={(e) => setRetryReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-100 px-3 py-1.5 text-sm"
            />
          </label>
          <ul className="divide-y divide-blue-50">
            {failed.map((ev) => (
              <li key={String(ev.id)} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-bold text-navy">{String(ev.id)}</p>
                  <p className="text-xs text-muted">
                    {String(ev.error_code ?? "—")} · {String(ev.received_at)}
                    {ev.payload_retained ? " · payload retained" : " · payload pruned"}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-xl bg-brand px-3 py-1.5 text-xs font-extrabold text-white"
                  onClick={() => setRetryId(String(ev.id))}
                  disabled={retryReason.trim().length < 5}
                >
                  Retry (idempotent)
                </button>
              </li>
            ))}
            {failed.length === 0 && <li className="py-4 text-sm text-muted">Geen mislukte events.</li>}
          </ul>
        </>
      )}

      <AdminStepUpModal
        open={retryId !== null}
        title="Webhook retry"
        description="Idempotente retry — mag orders/rewards niet dupliceren."
        requireOtp
        onClose={() => setRetryId(null)}
        onReady={async () => {
          if (!retryId) return;
          await retryIntegrationEvent(retryId, retryReason.trim());
          setNotice("Retry geaccepteerd.");
          setRetryId(null);
          await load();
        }}
      />
    </AdminListPage>
  );
}

export default function AdminIntegrationsPage() {
  return (
    <Suspense fallback={<p className="p-8">Laden…</p>}>
      <IntegrationsOps />
    </Suspense>
  );
}
