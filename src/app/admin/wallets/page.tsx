"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import AdminStepUpModal from "@/components/AdminStepUpModal";
import {
  fetchFinancialOversight,
  fetchWalletAdjustments,
  fetchWalletFlags,
  fetchWalletLedger,
  fetchWallets,
  requestWalletAdjustment,
  resolveWalletFlag,
  reviewWalletAdjustment,
} from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";
import { formatMinor } from "@/lib/money";

function WalletsFinancial() {
  const params = useSearchParams();
  const walletFocus = params.get("wallet") || "";
  const [wallets, setWallets] = useState<Array<Record<string, unknown>>>([]);
  const [ledger, setLedger] = useState<Array<Record<string, unknown>>>([]);
  const [adjustments, setAdjustments] = useState<Array<Record<string, unknown>>>([]);
  const [flags, setFlags] = useState<Array<Record<string, unknown>>>([]);
  const [oversight, setOversight] = useState<Record<string, unknown> | null>(null);
  const [selectedWallet, setSelectedWallet] = useState(walletFocus);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stepUp, setStepUp] = useState<"adjust" | "review" | "flag" | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approved" | "rejected">("approved");
  const [flagId, setFlagId] = useState<string | null>(null);

  const [adjForm, setAdjForm] = useState({
    wallet_id: "",
    consumer_id: "",
    source_entry_id: "",
    amount: "",
    reason: "",
    verification_note: "",
  });

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [w, adj, fl, ov] = await Promise.all([
        fetchWallets(),
        fetchWalletAdjustments("pending"),
        fetchWalletFlags("open"),
        fetchFinancialOversight().catch(() => null),
      ]);
      if (signal?.aborted) return;
      setWallets(w.data);
      setAdjustments(adj.data);
      setFlags(fl.data);
      setOversight(ov);
      const focus = walletFocus || (w.data[0] ? String(w.data[0].id) : "");
      setSelectedWallet((prev) => prev || focus);
      setError(null);
    } catch (err) {
      if (!signal?.aborted) setError(formatApiError(err, "Wallets laden mislukt."));
    }
  }, [walletFocus]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  useEffect(() => {
    if (!selectedWallet) {
      setLedger([]);
      return;
    }
    const ac = new AbortController();
    void fetchWalletLedger(selectedWallet)
      .then((res) => {
        if (!ac.signal.aborted) setLedger(res.data);
      })
      .catch(() => {
        if (!ac.signal.aborted) setLedger([]);
      });
    return () => ac.abort();
  }, [selectedWallet]);

  return (
    <AdminListPage
      title="Financieel"
      accent="wallets & oversight"
      subtitle="Ledger-inspectie en four-eyes wallet adjustments. Geen directe balance overwrite of cash withdrawals."
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/disputes" className="font-extrabold text-brand">
          Disputes →
        </Link>
        <Link href="/admin/affiliate" className="font-extrabold text-brand">
          Affiliate →
        </Link>
      </div>

      {notice && <p className="mb-3 text-sm font-semibold text-green-700">{notice}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 text-sm font-black text-navy">Wallets</h3>
          <ul className="max-h-64 divide-y divide-blue-50 overflow-y-auto">
            {wallets.map((row) => (
              <li key={String(row.id)}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWallet(String(row.id));
                    setAdjForm((f) => ({ ...f, wallet_id: String(row.id) }));
                  }}
                  className={`w-full py-2 text-left text-sm ${
                    selectedWallet === String(row.id) ? "font-extrabold text-brand" : "text-navy"
                  }`}
                >
                  {String(row.unit)} · {String(row.kind)} · beschikbaar {formatMinor(Number(row.available ?? 0))}
                </button>
              </li>
            ))}
            {wallets.length === 0 && <li className="py-4 text-sm text-muted">Geen wallets.</li>}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-black text-navy">Ledger {selectedWallet ? `(${selectedWallet})` : ""}</h3>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-xs text-muted">
            {ledger.map((e) => (
              <li key={String(e.id)} className="rounded-lg border border-blue-50 px-2 py-1.5">
                {String(e.type)} · {String(e.amount)} · {String(e.reason ?? "")} · {String(e.id)}
              </li>
            ))}
            {ledger.length === 0 && <li>Geen entries.</li>}
          </ul>
        </section>
      </div>

      <section className="mt-6 space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
        <h3 className="text-sm font-black text-navy">Wallet adjustment aanvragen</h3>
        <p className="text-xs text-muted">
          Compenserende ledger-entry via four-eyes. Directe balance overwrite is geblokkeerd.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["wallet_id", "Wallet ID"],
              ["consumer_id", "Consumer ID"],
              ["source_entry_id", "Source ledger entry"],
              ["amount", "Amount (integer, signed)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-xs font-bold text-muted">
              {label}
              <input
                value={adjForm[key]}
                onChange={(e) => setAdjForm((f) => ({ ...f, [key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm"
              />
            </label>
          ))}
          <label className="text-xs font-bold text-muted sm:col-span-2">
            Reason
            <input
              value={adjForm.reason}
              onChange={(e) => setAdjForm((f) => ({ ...f, reason: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-bold text-muted sm:col-span-2">
            Verification note
            <input
              value={adjForm.verification_note}
              onChange={(e) => setAdjForm((f) => ({ ...f, verification_note: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          className="rounded-xl bg-brand px-3 py-2 text-sm font-extrabold text-white"
          onClick={() => setStepUp("adjust")}
        >
          Aanvragen (step-up)
        </button>
      </section>

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-black text-navy">Pending adjustments (four-eyes)</h3>
        <ul className="divide-y divide-blue-50">
          {adjustments.map((a) => (
            <li key={String(a.id)} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-bold text-navy">
                  {String(a.amount)} {String(a.unit)} · {String(a.status)}
                </p>
                <p className="text-xs text-muted">{String(a.reason)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs font-extrabold text-green-700"
                  onClick={() => {
                    setReviewId(String(a.id));
                    setReviewDecision("approved");
                    setStepUp("review");
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="text-xs font-extrabold text-red-600"
                  onClick={() => {
                    setReviewId(String(a.id));
                    setReviewDecision("rejected");
                    setStepUp("review");
                  }}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
          {adjustments.length === 0 && <li className="py-3 text-sm text-muted">Geen pending adjustments.</li>}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-black text-navy">Reconciliation flags</h3>
        <ul className="divide-y divide-blue-50">
          {flags.map((f) => (
            <li key={String(f.id)} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-bold text-navy">{String(f.reason)}</p>
                <p className="text-xs text-muted">
                  wallet {String(f.wallet_id)} · {String(f.amount)} {String(f.unit)}
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-extrabold text-brand"
                onClick={() => {
                  setFlagId(String(f.id));
                  setStepUp("flag");
                }}
              >
                Resolve
              </button>
            </li>
          ))}
          {flags.length === 0 && <li className="py-3 text-sm text-muted">Geen open flags.</li>}
        </ul>
      </section>

      {oversight && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-black text-navy">Financial oversight snapshot</h3>
          <pre className="max-h-48 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-navy">
            {JSON.stringify(oversight, null, 2)}
          </pre>
        </section>
      )}

      <AdminStepUpModal
        open={stepUp !== null}
        title={
          stepUp === "adjust"
            ? "Wallet adjustment"
            : stepUp === "review"
              ? "Adjustment review"
              : "Flag resolve"
        }
        description="Wachtwoord + e-mail OTP. Compenserende ledger entries only."
        requireOtp
        onClose={() => {
          setStepUp(null);
          setReviewId(null);
          setFlagId(null);
        }}
        onReady={async () => {
          if (stepUp === "adjust") {
            const amount = Number(adjForm.amount);
            if (!Number.isInteger(amount) || amount === 0) throw new Error("Amount moet een niet-nul integer zijn.");
            await requestWalletAdjustment({
              wallet_id: adjForm.wallet_id.trim(),
              consumer_id: adjForm.consumer_id.trim(),
              source_entry_id: adjForm.source_entry_id.trim(),
              amount,
              reason: adjForm.reason.trim(),
              verification_note: adjForm.verification_note.trim(),
              request_key: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            });
            setNotice("Adjustment aangevraagd — wacht op second reviewer.");
          } else if (stepUp === "review" && reviewId) {
            await reviewWalletAdjustment(reviewId, reviewDecision, `Reviewed: ${reviewDecision}`);
            setNotice(`Adjustment ${reviewDecision}.`);
          } else if (stepUp === "flag" && flagId) {
            await resolveWalletFlag(flagId, "Resolved after ledger inspection");
            setNotice("Flag opgelost.");
          }
          await load();
        }}
      />
    </AdminListPage>
  );
}

export default function AdminWalletsPage() {
  return (
    <Suspense fallback={<p className="p-8">Laden…</p>}>
      <WalletsFinancial />
    </Suspense>
  );
}
