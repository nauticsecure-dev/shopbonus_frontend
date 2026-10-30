"use client";

import Link from "next/link";
import { useState } from "react";
import AdminListPage from "@/components/AdminListPage";
import AdminStepUpModal from "@/components/AdminStepUpModal";
import { exportAudit } from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 7);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function AdminAuditPage() {
  const range = defaultRange();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [integrity, setIntegrity] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AdminListPage
      title="Audit"
      accent="export & integrity"
      subtitle="Append-only, integrity-checked events. Export max 31 dagen. Geen ruwe PII/metadata payloads."
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/api-routes" className="font-extrabold text-brand">
          API route registry →
        </Link>
        <Link href="/admin/activity" className="font-extrabold text-brand">
          Live activity →
        </Link>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold text-muted">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="ml-2 rounded-lg border border-blue-100 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-bold text-muted">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="ml-2 rounded-lg border border-blue-100 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="rounded-xl bg-brand px-3 py-2 text-sm font-extrabold text-white"
          data-testid="audit-export"
        >
          Export (step-up)
        </button>
      </div>

      {integrity && (
        <p className="mb-3 text-xs text-muted">
          Integrity: {String(integrity.algorithm)} · head {String(integrity.head ?? "—")} ·{" "}
          {String(integrity.verification_command)}
        </p>
      )}
      {meta && (
        <p className="mb-3 text-sm text-muted">
          {String(meta.total ?? rows.length)} events · page {String(meta.current_page)}/{String(meta.last_page)}
        </p>
      )}

      <ul className="max-h-[28rem] divide-y divide-blue-50 overflow-y-auto">
        {rows.map((row, i) => (
          <li key={String(row.id ?? i)} className="py-2 text-sm">
            <p className="font-bold text-navy">
              {String(row.occurred_at)} · {String(row.action)} · {String(row.outcome)}
            </p>
            <p className="text-xs text-muted">
              {String(row.category)} · actor {String(row.actor_id ?? "—")}
              {row.real_actor_id ? ` · real ${String(row.real_actor_id)}` : ""}
              {row.request_id ? ` · req ${String(row.request_id)}` : ""}
            </p>
          </li>
        ))}
        {rows.length === 0 && <li className="py-6 text-sm text-muted">Nog geen export geladen.</li>}
      </ul>

      <AdminStepUpModal
        open={open}
        title="Audit export"
        description="Alleen geautoriseerde Super Admins. Max 31 dagen per request."
        requireOtp
        onClose={() => setOpen(false)}
        onReady={async () => {
          try {
            const res = await exportAudit(from, to);
            setRows(res.data);
            setIntegrity(res.integrity ?? null);
            setMeta(res.meta ?? null);
          } catch (err) {
            setError(formatApiError(err, "Export mislukt."));
            throw err;
          }
        }}
      />
    </AdminListPage>
  );
}
