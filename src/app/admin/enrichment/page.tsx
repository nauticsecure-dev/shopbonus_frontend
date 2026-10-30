"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import { apiRequest, ApiError } from "@/lib/api";

type EnrichmentRun = {
  id: string;
  webshop_id: string;
  webshop_name: string;
  status: string;
  trigger: string;
  source_url: string | null;
  review_required: boolean;
  risk_level: string | null;
  cover_ready: boolean;
  cover_failure_code: string | null;
  failure_code: string | null;
  created_at: string;
  finished_at: string | null;
};

type ListResponse = {
  data: EnrichmentRun[];
  availability: { configured: boolean; auto_publish: boolean };
  meta?: { total: number };
};

const STATUSES = ["awaiting_review", "queued", "running", "published", "rejected", "failed"] as const;

function EnrichmentReviewList() {
  const params = useSearchParams();
  const statusFilter = params.get("status") || "awaiting_review";
  const [rows, setRows] = useState<EnrichmentRun[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState("Homepage copy reviewed and approved for discovery.");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      const res = await apiRequest<ListResponse>({
        path: `/api/v1/admin/merchant-enrichments?${qs}`,
        signal,
      });
      if (signal?.aborted) return;
      setRows(res.data);
      setConfigured(res.availability?.configured ?? false);
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof ApiError ? err.message : "Enrichment-runs laden mislukt.");
      setRows([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const decide = async (runId: string, action: "approve" | "reject") => {
    setBusyId(runId);
    setError(null);
    try {
      await apiRequest({
        path: `/api/v1/admin/merchant-enrichments/${runId}/${action}`,
        method: "POST",
        body: { note },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `${action} mislukt.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminListPage
      title="Merchant enrichment"
      accent={statusFilter}
      subtitle="AI-voorstellen voor webshopprofielen. Goedkeuren publiceert naar discovery; afwijzen blijft auditbaar."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <a
            key={s}
            href={`/admin/enrichment?status=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              statusFilter === s ? "bg-brand text-white" : "border border-blue-100 bg-white text-navy"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      {configured === false && (
        <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Enrichment is niet geconfigureerd op de API (`MERCHANT_ENRICHMENT_ENABLED` / OpenAI-key).
        </p>
      )}

      <label className="mb-4 block text-sm text-muted">
        Reviewnotitie (min. 5 tekens)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2 text-sm text-navy outline-none focus:border-brand"
        />
      </label>

      {loading && <p className="text-sm text-muted">Laden…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <ul className="divide-y divide-blue-50">
          {rows.map((row) => (
            <li key={row.id} className="py-4">
              <p className="font-extrabold text-navy">
                {row.webshop_name}{" "}
                <span className="text-xs font-semibold text-muted">· {row.status}</span>
              </p>
              <p className="text-xs text-muted">
                {row.source_url ?? "—"} · trigger {row.trigger}
                {row.risk_level ? ` · risk ${row.risk_level}` : ""}
                {row.cover_failure_code ? ` · cover ${row.cover_failure_code}` : row.cover_ready ? " · cover ok" : ""}
              </p>
              {row.status === "awaiting_review" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === row.id || note.trim().length < 5}
                    onClick={() => void decide(row.id, "approve")}
                    className="rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                  >
                    Goedkeuren
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.id || note.trim().length < 5}
                    onClick={() => void decide(row.id, "reject")}
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-extrabold text-red-600 disabled:opacity-50"
                  >
                    Afwijzen
                  </button>
                </div>
              )}
            </li>
          ))}
          {rows.length === 0 && <li className="py-6 text-sm text-muted">Geen runs voor dit filter.</li>}
        </ul>
      )}
    </AdminListPage>
  );
}

export default function AdminEnrichmentPage() {
  return (
    <Suspense fallback={<p className="p-8">Laden…</p>}>
      <EnrichmentReviewList />
    </Suspense>
  );
}
