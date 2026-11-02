"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Panel, PanelHeading } from "@/components/DashboardPrimitives";
import { apiRequest } from "@/lib/api";

type Component = Record<string, unknown> & { status?: string; state?: string };
type Overview = { observed_at: string; components: Record<string, Component>; limits: string };
const systems = [
  ["api", "API", "/admin/incidents"],
  ["queue", "Queues", "/admin/integrations"],
  ["database", "Database", "/admin/incidents"],
  ["financial", "Reconciliation", "/admin/wallets"],
  ["security", "Security", "/admin/incidents"],
  ["backups", "Backups & restore", "/admin/incidents"],
  ["scheduler", "Scheduler", "/admin/integrations"],
  ["incidents", "Open incidents", "/admin/incidents"],
] as const;
const styles: Record<string, string> = {
  HEALTHY: "bg-emerald-50 text-emerald-800", WARNING: "bg-amber-50 text-amber-800",
  CRITICAL: "bg-red-50 text-red-800", UNKNOWN: "bg-slate-100 text-slate-700",
};

function value(input: unknown): string {
  return typeof input === "string" || typeof input === "number" ? String(input) : "UNKNOWN";
}

export default function AdminOperationsOverview() {
  const [report, setReport] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(false);
      // Clear the old observation so a failed refresh cannot leave a green card.
      setReport(null);
      try {
        const result = await apiRequest<{ data: Overview }>({ path: "/api/v1/admin/operations-overview", cache: "no-store", signal: controller.signal });
        if (!controller.signal.aborted && result.data?.components) setReport(result.data);
        else if (!controller.signal.aborted) setError(true);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 60000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [revision, refresh]);

  const backups = report?.components.backups;
  const financial = report?.components.financial;
  return <Panel id="operations" className="mb-5">
    <PanelHeading title="Platform operations" description="API, queues, database, recovery and reconciliation observations."
      action={<button type="button" onClick={refresh} disabled={loading} className="rounded-lg border border-blue-100 px-3 py-2 text-sm font-bold">Refresh operations</button>} />
    {loading && <p role="status">Loading operations…</p>}
    {error && <p role="alert" className="mb-3 text-red-800">Operations unavailable. All components are UNKNOWN. Retry with Refresh operations.</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {systems.map(([key, label, href]) => {
        const component = report?.components[key];
        const raw = component?.status ?? component?.state ?? "UNKNOWN";
        const status = raw in styles ? raw : "UNKNOWN";
        return <div key={key} data-testid={`operations-${key}`} className="rounded-xl border border-blue-100 p-3">
          <Link href={href} className="font-bold text-navy underline">{label}</Link>
          <span className={`mt-2 block w-fit rounded px-2 py-1 text-xs font-bold ${styles[status]}`}>{status}</span>
          {typeof component?.reason === "string" && <p className="mt-2 text-xs text-muted">{component.reason}</p>}
        </div>;
      })}
    </div>
    {report && <>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <div><dt>Observed at</dt><dd>{value(report.observed_at)}</dd></div>
        <div><dt>Last backup</dt><dd>{value(backups?.last_backup_at)}</dd></div>
        <div><dt>Last verified restore</dt><dd>{value(backups?.last_verified_restore_at)}</dd></div>
        <div><dt>Backup success (30 days)</dt><dd>{value(backups?.backup_success_percent_30d)}</dd></div>
        <div><dt>Reconciliation discrepancies</dt><dd>{value(financial?.discrepancies)}</dd></div>
        <div><dt>Reconciliation run</dt><dd>{value(financial?.run)}</dd></div>
      </dl>
      <p className="mt-3 text-sm text-muted">Recovery targets: UNAPPROVED — financial RPO ≤15 minutes; service RTO ≤4 hours. Offsite storage, key recovery and a timed infrastructure drill require verification.</p>
      <details className="mt-3 text-sm"><summary className="cursor-pointer font-bold">Queue observations</summary>
        {Object.entries((report.components.queue?.connections ?? {}) as Record<string, Component>).map(([connection, data]) =>
          <div key={connection} className="mt-2"><strong>{connection}</strong>
            {Object.entries((data.queues ?? {}) as Record<string, Component>).map(([queue, metrics]) =>
              <p key={queue}>{queue}: {value(metrics.status)} · jobs {value(metrics.size)} · ready jobs {value(metrics.ready_jobs)} · ready wait {value(metrics.ready_wait_seconds)} seconds · worker {value(metrics.worker_status)}</p>)}
          </div>)}
      </details>
      <p className="mt-3 text-xs text-muted">{report.limits} Financial matching proves management allocation; recognized revenue remains unverified.</p>
    </>}
    <div className="mt-3 flex gap-4 text-sm font-bold"><Link href="/admin/audit">Audit history</Link><Link href="/admin/wallets">Financial details</Link><Link href="/admin/incidents">Monitoring incidents</Link></div>
  </Panel>;
}
