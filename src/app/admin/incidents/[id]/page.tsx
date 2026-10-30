"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import AdminStepUpModal from "@/components/AdminStepUpModal";
import {
  fetchIncident,
  fetchIncidentDiagnostics,
  requestIncidentDiagnostic,
  reviewIncidentDiagnostic,
  updateIncident,
  type SecurityIncident,
} from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";

export default function AdminIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<SecurityIncident | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [occurrences, setOccurrences] = useState<Array<Record<string, unknown>>>([]);
  const [diagnostics, setDiagnostics] = useState<Array<Record<string, unknown>>>([]);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState("investigating");
  const [reason, setReason] = useState("");
  const [stepUp, setStepUp] = useState<"diagnose" | "review" | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ id: string; decision: "accepted" | "dismissed" } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [detail, diag] = await Promise.all([
        fetchIncident(id),
        fetchIncidentDiagnostics(id).catch(() => ({ data: [], availability: { configured: false } })),
      ]);
      if (signal?.aborted) return;
      setIncident(detail.data);
      setHistory(detail.history ?? []);
      setOccurrences(detail.occurrences ?? []);
      setStatus(detail.data.status);
      setDiagnostics(diag.data);
      setAiConfigured(Boolean(diag.availability?.configured));
      setError(null);
    } catch (err) {
      if (!signal?.aborted) setError(formatApiError(err, "Incident laden mislukt."));
    }
  }, [id]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const saveStatus = async () => {
    if (!incident || reason.trim().length < 5) {
      setError("Reden minstens 5 tekens.");
      return;
    }
    try {
      const updated = await updateIncident(incident.id, {
        status,
        assigned_to: incident.assigned_to ?? null,
        reason: reason.trim(),
      });
      setIncident(updated);
      setNotice("Status bijgewerkt.");
      setReason("");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Status bijwerken mislukt."));
    }
  };

  const runDiagnose = async () => {
    const key = `diag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await requestIncidentDiagnostic(id, key);
    setNotice("AI-diagnose gestart (advisory only — geen automatische wijzigingen).");
    await load();
  };

  const runReview = async () => {
    if (!reviewTarget || reviewNote.trim().length < 5) throw new Error("Review note minstens 5 tekens.");
    await reviewIncidentDiagnostic(reviewTarget.id, reviewTarget.decision, reviewNote.trim());
    setNotice(`Diagnose ${reviewTarget.decision}.`);
    setReviewTarget(null);
    setReviewNote("");
    await load();
  };

  return (
    <AdminListPage title="Incident" accent={incident?.id ?? id} backHref="/admin/incidents">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-3 text-sm font-semibold text-green-700">{notice}</p>}
      {!incident && !error && <p className="text-sm text-muted">Laden…</p>}

      {incident && (
        <div className="space-y-6">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-bold text-muted">Severity / category</dt>
              <dd className="font-extrabold text-navy">
                {incident.severity} · {incident.category}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">HTTP</dt>
              <dd className="font-extrabold text-navy">
                {incident.http_status} · {incident.method} {incident.route}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">Service</dt>
              <dd className="font-extrabold text-navy">{incident.service}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">Occurrences</dt>
              <dd className="font-extrabold text-navy">{incident.occurrences ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">Eerste / laatste</dt>
              <dd className="text-sm text-navy">
                {incident.first_seen_at ? new Date(incident.first_seen_at).toLocaleString() : "—"}
                {" → "}
                {incident.last_seen_at ? new Date(incident.last_seen_at).toLocaleString() : "—"}
              </dd>
            </div>
          </dl>

          <section className="space-y-2 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <h3 className="text-sm font-black text-navy">Status bijwerken</h3>
            <div className="flex flex-wrap gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-blue-100 px-2 py-1.5 text-sm font-bold text-navy"
              >
                {["new", "investigating", "resolved", "ignored"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reden…"
                className="min-w-[200px] flex-1 rounded-lg border border-blue-100 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => void saveStatus()}
                className="rounded-xl bg-brand px-3 py-2 text-sm font-extrabold text-white"
              >
                Opslaan
              </button>
            </div>
          </section>

          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-navy">AI-assisted diagnostics</h3>
              <button
                type="button"
                disabled={!aiConfigured}
                onClick={() => setStepUp("diagnose")}
                className="rounded-xl bg-navy px-3 py-2 text-sm font-extrabold text-white disabled:opacity-40"
                data-testid="analyze-error"
              >
                Analyze Error
              </button>
            </div>
            {!aiConfigured && (
              <p className="text-xs text-muted">AI-provider niet geconfigureerd — diagnose niet beschikbaar.</p>
            )}
            <p className="mb-2 text-xs text-muted">
              Alleen geredacteerde technische context. AI kan geen fixes deployen, rechten wijzigen of incidenten
              sluiten.
            </p>
            <ul className="space-y-3">
              {diagnostics.map((d) => {
                const analysis = d.analysis as Record<string, unknown> | null | undefined;
                return (
                  <li key={String(d.id)} className="rounded-xl border border-blue-50 bg-slate-50 p-3 text-sm">
                    <p className="font-extrabold text-navy">
                      {String(d.status)} · {String(d.id)}
                    </p>
                    {analysis && (
                      <pre className="mt-2 max-h-48 overflow-auto text-xs text-navy">
                        {JSON.stringify(analysis, null, 2)}
                      </pre>
                    )}
                    {d.status === "completed" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Review note…"
                          className="rounded-lg border border-blue-100 px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          className="text-xs font-extrabold text-green-700"
                          onClick={() => {
                            setReviewTarget({ id: String(d.id), decision: "accepted" });
                            setStepUp("review");
                          }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="text-xs font-extrabold text-red-600"
                          onClick={() => {
                            setReviewTarget({ id: String(d.id), decision: "dismissed" });
                            setStepUp("review");
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
              {diagnostics.length === 0 && <li className="text-sm text-muted">Nog geen diagnoses.</li>}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-black text-navy">Occurrences</h3>
            <ul className="max-h-64 space-y-1 overflow-y-auto text-xs text-muted">
              {occurrences.map((o) => (
                <li key={String(o.id)} className="rounded-lg border border-blue-50 px-2 py-1.5">
                  {String(o.occurred_at)} · req {String(o.request_id ?? "—")} · {String(o.error_code ?? "")}
                </li>
              ))}
              {occurrences.length === 0 && <li>Geen occurrences.</li>}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-black text-navy">Action history</h3>
            <ul className="text-xs text-muted">
              {history.map((h, i) => (
                <li key={i}>
                  {String(h.occurred_at)} · {String(h.actor_id ?? "system")} ·{" "}
                  {JSON.stringify(h.change ?? {})}
                </li>
              ))}
              {history.length === 0 && <li>Geen geschiedenis.</li>}
            </ul>
          </section>
        </div>
      )}

      <AdminStepUpModal
        open={stepUp !== null}
        title={stepUp === "diagnose" ? "Analyze Error" : "Diagnose reviewen"}
        description="Wachtwoord + e-mail OTP. AI blijft advisory-only."
        requireOtp
        onClose={() => {
          setStepUp(null);
          setReviewTarget(null);
        }}
        onReady={stepUp === "diagnose" ? runDiagnose : runReview}
      />
    </AdminListPage>
  );
}
