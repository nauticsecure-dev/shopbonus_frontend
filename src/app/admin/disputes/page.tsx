"use client";

import { useCallback, useEffect, useState } from "react";
import AdminListPage from "@/components/AdminListPage";
import AdminStepUpModal from "@/components/AdminStepUpModal";
import { fetchDisputes, resolveDispute, updateDisputeStatus } from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";

export default function AdminDisputesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [stepUp, setStepUp] = useState<"status" | "resolve" | null>(null);
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<"resolved" | "rejected">("resolved");
  const [compensation, setCompensation] = useState<"none" | "wallet_credit" | "replacement" | "refund">("none");

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetchDisputes();
      if (signal?.aborted) return;
      setRows(res.data);
      setError(null);
    } catch (err) {
      if (!signal?.aborted) setError(formatApiError(err, "Disputes laden mislukt."));
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  return (
    <AdminListPage
      title="Disputes"
      accent="vouchers"
      backHref="/admin/wallets"
      subtitle="Gecontroleerde dispute-beslissingen en toegestane compensatie."
    >
      {notice && <p className="mb-3 text-sm font-semibold text-green-700">{notice}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-blue-50">
        {rows.map((row) => (
          <li key={String(row.id)} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <div>
              <p className="font-extrabold text-navy">{String(row.id)}</p>
              <p className="text-xs text-muted">
                {String(row.status ?? "—")} · {String(row.reason ?? row.category ?? "")}
              </p>
            </div>
            <button
              type="button"
              className="font-extrabold text-brand"
              onClick={() => {
                setSelected(row);
                setNote("");
              }}
            >
              Beheren
            </button>
          </li>
        ))}
        {rows.length === 0 && !error && <li className="py-6 text-sm text-muted">Geen disputes.</li>}
      </ul>

      {selected && (
        <section className="mt-6 space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          <h3 className="text-sm font-black text-navy">Dispute {String(selected.id)}</h3>
          <label className="block text-xs font-bold text-muted">
            Note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-extrabold text-navy"
              onClick={() => setStepUp("status")}
            >
              Mark under review
            </button>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as "resolved" | "rejected")}
              className="rounded-lg border border-blue-100 px-2 py-1.5 text-sm"
            >
              <option value="resolved">resolved</option>
              <option value="rejected">rejected</option>
            </select>
            <select
              value={compensation}
              onChange={(e) =>
                setCompensation(e.target.value as "none" | "wallet_credit" | "replacement" | "refund")
              }
              className="rounded-lg border border-blue-100 px-2 py-1.5 text-sm"
            >
              <option value="none">geen compensatie</option>
              <option value="wallet_credit">wallet credit</option>
              <option value="replacement">replacement voucher</option>
              <option value="refund">Mollie refund</option>
            </select>
            <button
              type="button"
              className="rounded-xl bg-brand px-3 py-2 text-sm font-extrabold text-white"
              onClick={() => setStepUp("resolve")}
            >
              Resolve
            </button>
          </div>
        </section>
      )}

      <AdminStepUpModal
        open={stepUp !== null}
        title={stepUp === "resolve" ? "Dispute resolve" : "Dispute status"}
        description="Bevestig wachtwoord voor dispute-actie."
        requireOtp={false}
        onClose={() => setStepUp(null)}
        onReady={async () => {
          if (!selected) return;
          const id = String(selected.id);
          if (stepUp === "status") {
            await updateDisputeStatus(id, { status: "under_review", note: note.trim() || null });
            setNotice("Status → under_review");
          } else {
            if (note.trim().length < 5) throw new Error("Note minstens 5 tekens.");
            await resolveDispute(id, {
              outcome,
              compensation,
              note: note.trim(),
            });
            setNotice(`Dispute ${outcome} met compensatie ${compensation}.`);
          }
          setSelected(null);
          await load();
        }}
      />
    </AdminListPage>
  );
}
