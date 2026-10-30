"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import { fetchIncidents, type SecurityIncident } from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";

const STATUSES = ["", "new", "investigating", "resolved", "ignored"] as const;
const SEVERITIES = ["", "warning", "error"] as const;

function IncidentsList() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("status") || "";
  const severity = params.get("severity") || "";
  const [rows, setRows] = useState<SecurityIncident[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    void fetchIncidents({
      status: status || undefined,
      severity: severity || undefined,
      service: params.get("service") || undefined,
      method: params.get("method") || undefined,
      request_category: params.get("request_category") || undefined,
      from: params.get("from") || undefined,
      to: params.get("to") || undefined,
    })
      .then((res) => {
        if (ac.signal.aborted) return;
        setRows(res.data);
        setTotal(res.meta?.total ?? res.data.length);
        setError(null);
      })
      .catch((err) => {
        if (!ac.signal.aborted) setError(formatApiError(err, "Incidenten laden mislukt."));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [status, severity, params]);

  const apply = (key: string, value: string) => {
    const qs = new URLSearchParams(params.toString());
    if (value) qs.set(key, value);
    else qs.delete(key);
    router.push(`/admin/incidents?${qs}`);
  };

  return (
    <AdminListPage
      title="Incidenten"
      accent="security & API"
      subtitle="Gegroepeerde API-fouten, 403-denials en systeemfouten. Geen credentials of stack traces."
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-xs font-bold text-muted">
          Status
          <select
            value={status}
            onChange={(e) => apply("status", e.target.value)}
            className="ml-2 rounded-lg border border-blue-100 px-2 py-1.5 text-sm font-bold text-navy"
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "alle"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-muted">
          Severity
          <select
            value={severity}
            onChange={(e) => apply("severity", e.target.value)}
            className="ml-2 rounded-lg border border-blue-100 px-2 py-1.5 text-sm font-bold text-navy"
          >
            {SEVERITIES.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "alle"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="text-sm text-muted">Laden…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <>
          <p className="mb-4 text-sm text-muted">{total} incidenten</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-blue-50 text-xs font-bold uppercase text-muted">
                  <th className="py-2 pr-2">Severity</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">HTTP</th>
                  <th className="py-2 pr-2">Route</th>
                  <th className="py-2 pr-2">Service</th>
                  <th className="py-2 pr-2">×</th>
                  <th className="py-2 pr-2">Laatst</th>
                  <th className="py-2"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-2 font-bold text-navy">{row.severity}</td>
                    <td className="py-2 pr-2">{row.status}</td>
                    <td className="py-2 pr-2 font-mono">{row.http_status}</td>
                    <td className="py-2 pr-2 font-mono text-xs">
                      {row.method} {row.route}
                    </td>
                    <td className="py-2 pr-2 text-muted">{row.service}</td>
                    <td className="py-2 pr-2">{row.occurrences ?? "—"}</td>
                    <td className="py-2 pr-2 text-xs text-muted">
                      {row.last_seen_at ? new Date(row.last_seen_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-2">
                      <Link href={`/admin/incidents/${row.id}`} className="font-extrabold text-brand">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <p className="py-6 text-sm text-muted">Geen incidenten.</p>}
        </>
      )}
    </AdminListPage>
  );
}

export default function AdminIncidentsPage() {
  return (
    <Suspense fallback={<p className="p-8">Laden…</p>}>
      <IncidentsList />
    </Suspense>
  );
}
