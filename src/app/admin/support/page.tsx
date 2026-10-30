"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import { ApiError } from "@/lib/api";
import {
  fetchAiReview,
  fetchAiReviews,
  replyToConversation,
  resolveAiReview,
  type ReviewDetail,
  type ReviewListItem,
} from "@/lib/aiSupportAdmin";

function SupportList() {
  const params = useSearchParams();
  const outcome = params.get("outcome") || "open";
  const reviewId = params.get("review");
  const [rows, setRows] = useState<ReviewListItem[]>([]);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("Reviewed with source inspection");
  const [intent, setIntent] = useState("reward");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    void fetchAiReviews(outcome)
      .then((data) => {
        if (!ac.signal.aborted) setRows(data);
      })
      .catch((err) => {
        if (!ac.signal.aborted) setError(err instanceof ApiError ? err.message : "Supportcases laden mislukt.");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [outcome]);

  useEffect(() => {
    if (!reviewId) {
      setDetail(null);
      return;
    }
    void fetchAiReview(reviewId)
      .then(setDetail)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Review laden mislukt."));
  }, [reviewId]);

  const resolve = async (decision: "CONFIRMED_ERROR" | "ANSWER_CORRECT" | "NEEDS_INVESTIGATION") => {
    if (!detail) return;
    setBusy(true);
    try {
      await resolveAiReview(detail.id, {
        outcome: decision,
        note,
        expected_intent: decision === "CONFIRMED_ERROR" ? intent : undefined,
      });
      setDetail(await fetchAiReview(detail.id));
      setRows(await fetchAiReviews(outcome));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Resolve mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!detail || !reply.trim()) return;
    setBusy(true);
    try {
      await replyToConversation(detail.conversation_id, reply.trim());
      setReply("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Antwoord mislukt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminListPage
      title="Support"
      accent={outcome}
      subtitle="Reviews, evidence-inspectie, correcties en menselijke antwoorden."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {["open", "CONFIRMED_ERROR", "ANSWER_CORRECT", "NEEDS_INVESTIGATION"].map((o) => (
          <Link
            key={o}
            href={`/admin/support?outcome=${o}`}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              outcome === o ? "bg-brand text-white" : "border border-blue-100 bg-white text-navy"
            }`}
          >
            {o}
          </Link>
        ))}
        <Link href="/app/platform/ai-support/settings" className="rounded-full border border-blue-100 px-3 py-1.5 text-xs font-bold text-brand">
          AI settings →
        </Link>
      </div>

      {loading && <p className="text-sm text-muted">Laden…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <ul className="divide-y divide-blue-50">
          {rows.map((row) => (
            <li key={row.id} className="py-3">
              <Link href={`/admin/support?outcome=${outcome}&review=${row.id}`} className="block hover:bg-mist/50 rounded-xl px-2 py-1">
                <p className="font-extrabold text-navy">{row.id}</p>
                <p className="text-xs text-muted">
                  {row.trigger} · {row.outcome ?? "open"} · msg {row.message_id}
                </p>
              </Link>
            </li>
          ))}
          {!loading && rows.length === 0 && <li className="py-6 text-sm text-muted">Geen supportcases.</li>}
        </ul>

        {detail && (
          <div className="space-y-3 rounded-2xl border border-blue-100 bg-mist/30 p-4">
            <h3 className="font-extrabold text-navy">Review detail</h3>
            <p className="text-sm">
              <strong>Vraag:</strong> {detail.question}
            </p>
            <pre className="max-h-40 overflow-auto rounded-xl bg-white p-3 text-xs">{JSON.stringify(detail.result, null, 2)}</pre>
            <pre className="max-h-40 overflow-auto rounded-xl bg-white p-3 text-xs">{JSON.stringify(detail.evidence, null, 2)}</pre>
            <pre className="max-h-32 overflow-auto rounded-xl bg-white p-3 text-xs">{JSON.stringify(detail.research, null, 2)}</pre>
            <p className="text-xs text-muted">
              retry_used={String(detail.retry_used)} · failure={detail.failure_code || "—"} · regression=
              {String(detail.regression_added)}
            </p>
            <label className="block text-sm font-bold text-navy">
              Notitie
              <textarea className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <label className="block text-sm font-bold text-navy">
              Expected intent (bij CONFIRMED_ERROR)
              <input className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" value={intent} onChange={(e) => setIntent(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void resolve("ANSWER_CORRECT")} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
                ANSWER_CORRECT
              </button>
              <button type="button" disabled={busy} onClick={() => void resolve("CONFIRMED_ERROR")} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">
                CONFIRMED_ERROR
              </button>
              <button type="button" disabled={busy} onClick={() => void resolve("NEEDS_INVESTIGATION")} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white">
                NEEDS_INVESTIGATION
              </button>
            </div>
            <label className="block text-sm font-bold text-navy">
              Menselijk antwoord
              <textarea className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
            </label>
            <button type="button" disabled={busy || !reply.trim()} onClick={() => void sendReply()} className="rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-white">
              Stuur antwoord
            </button>
          </div>
        )}
      </div>
    </AdminListPage>
  );
}

export default function AdminSupportPage() {
  return (
    <Suspense fallback={<p className="p-8">Laden…</p>}>
      <SupportList />
    </Suspense>
  );
}
