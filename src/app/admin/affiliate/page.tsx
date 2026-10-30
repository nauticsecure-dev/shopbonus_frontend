"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import {
  createAffiliateRewardRule,
  fetchAffiliateConnections,
  fetchAffiliatePrograms,
  fetchAffiliateRewardRules,
  fetchAffiliateTransactions,
  matchAffiliateProgram,
  resolveAffiliateTransaction,
  syncAffiliateConnection,
  testAffiliateConnection,
} from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";
import { formatMinor } from "@/lib/money";

type Tab = "overview" | "connections" | "programs" | "transactions" | "rules";

function AffiliateConsole() {
  const params = useSearchParams();
  const initialTab = (params.get("tab") as Tab) || "overview";
  const statusFilter = params.get("status") || "";
  const networkFilter = params.get("network") || "";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [connections, setConnections] = useState<Array<Record<string, unknown>>>([]);
  const [programs, setPrograms] = useState<Array<Record<string, unknown>>>([]);
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([]);
  const [totals, setTotals] = useState<Record<string, { count: number; commission_minor: number }>>({});
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [currentRule, setCurrentRule] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [webshopMatch, setWebshopMatch] = useState("");
  const [resolveNote, setResolveNote] = useState("Verified against merchant evidence");
  const [ruleForm, setRuleForm] = useState({ unit: "eur_credit", share_bps: "7000", min_commission_minor: "0" });

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [c, p, t, r] = await Promise.all([
        fetchAffiliateConnections(),
        fetchAffiliatePrograms({ unmatched: true }),
        fetchAffiliateTransactions({
          status: statusFilter || undefined,
          network: networkFilter || undefined,
        }),
        fetchAffiliateRewardRules(),
      ]);
      if (signal?.aborted) return;
      setConnections(c.data);
      setPrograms(p.data);
      setTransactions(t.data);
      setTotals(t.totals ?? {});
      setRules(r.data);
      setCurrentRule(r.current ?? null);
      setError(null);
    } catch (err) {
      if (!signal?.aborted) setError(formatApiError(err, "Affiliate laden mislukt."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [statusFilter, networkFilter]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const onTest = async (id: string) => {
    try {
      await testAffiliateConnection(id);
      setNotice("Connectietest uitgevoerd.");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Test mislukt."));
    }
  };

  const onSync = async (id: string) => {
    try {
      const res = await syncAffiliateConnection(id, true);
      setNotice(res.queued ? "Sync in de wachtrij geplaatst." : "Sync afgerond.");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Sync mislukt."));
    }
  };

  const onMatch = async (programId: string) => {
    if (!webshopMatch.trim()) {
      setError("Vul een webshop public id in om te matchen.");
      return;
    }
    try {
      await matchAffiliateProgram(programId, { webshop_id: webshopMatch.trim(), cashback_allowed: true });
      setNotice("Program gekoppeld.");
      setWebshopMatch("");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Match mislukt."));
    }
  };

  const onResolve = async (id: string, action: "accept" | "reject") => {
    try {
      await resolveAffiliateTransaction(id, { action, note: resolveNote.trim() || "Admin review" });
      setNotice(`Conversie ${action === "accept" ? "geaccepteerd" : "afgewezen"}.`);
      await load();
    } catch (err) {
      setError(formatApiError(err, "Resolve mislukt."));
    }
  };

  const onCreateRule = async () => {
    try {
      await createAffiliateRewardRule({
        unit: ruleForm.unit,
        share_bps: Number(ruleForm.share_bps),
        min_commission_minor: Number(ruleForm.min_commission_minor || 0),
      });
      setNotice("Reward rule aangemaakt (vorige blijft in historie).");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Rule opslaan mislukt."));
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overzicht" },
    { id: "connections", label: "Netwerken" },
    { id: "programs", label: "Programma's" },
    { id: "transactions", label: "Conversies" },
    { id: "rules", label: "Reward rules" },
  ];

  return (
    <AdminListPage
      title="Affiliate & wallet"
      accent="tracking & reconciliatie"
      subtitle="Daisycon/TradeTracker health, program matching, reward rules en review. Geen directe balance edits."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-extrabold ${
              tab === t.id ? "bg-brand text-white" : "bg-white text-navy shadow-sm"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-muted">Laden…</p>}
      {notice && <p className="mb-3 text-sm font-semibold text-green-700">{notice}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {!loading && tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(totals).map(([status, row]) => (
            <div key={status} className="rounded-2xl border border-blue-50 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{status}</p>
              <p className="mt-1 text-2xl font-black text-navy">{row.count}</p>
              <p className="text-xs text-muted">{formatMinor(row.commission_minor)} commissie</p>
            </div>
          ))}
          {Object.keys(totals).length === 0 && (
            <p className="text-sm text-muted">Nog geen conversies gesynchroniseerd.</p>
          )}
          <div className="rounded-2xl border border-blue-50 bg-white p-4 sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Connecties</p>
            <ul className="mt-2 space-y-1 text-sm">
              {connections.map((c) => (
                <li key={String(c.id)} className="flex justify-between gap-2">
                  <span className="font-semibold text-navy">{String(c.network)}</span>
                  <span className="text-muted">{String(c.status)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Live verificatie: adapters zijn NOT VERIFIED tot publisher-accounts zijn geconfigureerd.
            </p>
          </div>
        </div>
      )}

      {!loading && tab === "connections" && (
        <ul className="divide-y divide-blue-50">
          {connections.map((c) => (
            <li key={String(c.id)} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-extrabold text-navy">
                  {String(c.name)} · {String(c.network)}
                </p>
                <p className="text-xs text-muted">
                  {String(c.status)}
                  {c.last_error ? ` · ${String(c.last_error)}` : ""}
                  {c.last_synced_at ? ` · sync ${String(c.last_synced_at)}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void onTest(String(c.id))}
                  className="rounded-xl bg-mist px-3 py-2 text-xs font-extrabold text-navy"
                >
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => void onSync(String(c.id))}
                  className="rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white"
                >
                  Sync (queue)
                </button>
              </div>
            </li>
          ))}
          {connections.length === 0 && <li className="py-6 text-sm text-muted">Geen connecties.</li>}
        </ul>
      )}

      {!loading && tab === "programs" && (
        <div>
          <label className="mb-3 block text-sm">
            <span className="font-bold text-navy">Webshop public id voor match</span>
            <input
              value={webshopMatch}
              onChange={(e) => setWebshopMatch(e.target.value)}
              className="mt-1 w-full max-w-md rounded-xl border border-blue-100 px-3 py-2"
              placeholder="01J…"
            />
          </label>
          <ul className="divide-y divide-blue-50">
            {programs.map((p) => (
              <li key={String(p.id)} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-extrabold text-navy">
                    {String(p.name)} · {String(p.network)}
                  </p>
                  <p className="text-xs text-muted">
                    {String(p.domain ?? "—")} · unmatched
                    {p.cashback_allowed ? "" : " · cashback blocked"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onMatch(String(p.id))}
                  className="rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white"
                >
                  Match webshop
                </button>
              </li>
            ))}
            {programs.length === 0 && <li className="py-6 text-sm text-muted">Geen unmatched programma&apos;s.</li>}
          </ul>
        </div>
      )}

      {!loading && tab === "transactions" && (
        <div>
          <label className="mb-3 block text-sm">
            <span className="font-bold text-navy">Resolve note</span>
            <input
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              className="mt-1 w-full max-w-xl rounded-xl border border-blue-100 px-3 py-2"
            />
          </label>
          <ul className="divide-y divide-blue-50">
            {transactions.map((row) => {
              const reward = row.reward as Record<string, unknown> | undefined;
              const needsReview = ["unmatched", "disputed", "tracked"].includes(String(row.status));
              return (
                <li key={String(row.id)} className="py-3">
                  <p className="font-extrabold text-navy">
                    {String(row.network)} · {String(row.external_id)}
                  </p>
                  <p className="text-xs text-muted">
                    status {String(row.status)} · reward {String(reward?.status ?? "—")} · commissie{" "}
                    {formatMinor(Number(row.commission_minor ?? 0), String(row.currency ?? "EUR"))}
                    {row.review_reason ? ` · ${String(row.review_reason)}` : ""}
                  </p>
                  {needsReview && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void onResolve(String(row.id), "accept")}
                        className="rounded-xl bg-brand px-3 py-1.5 text-xs font-extrabold text-white"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => void onResolve(String(row.id), "reject")}
                        className="rounded-xl bg-mist px-3 py-1.5 text-xs font-extrabold text-navy"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
            {transactions.length === 0 && <li className="py-6 text-sm text-muted">Geen conversies gevonden.</li>}
          </ul>
        </div>
      )}

      {!loading && tab === "rules" && (
        <div className="space-y-6">
          <p className="text-sm text-muted">
            Actieve rule-versie: <strong className="text-navy">{currentRule ?? "—"}</strong>. Historische
            regels blijven bewaard; balances worden nooit handmatig overschreven.
          </p>
          <div className="grid max-w-lg gap-3 rounded-2xl border border-blue-50 bg-white p-4">
            <label className="text-sm font-bold text-navy">
              Unit
              <select
                value={ruleForm.unit}
                onChange={(e) => setRuleForm((f) => ({ ...f, unit: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
              >
                <option value="eur_credit">eur_credit</option>
                <option value="points">points</option>
              </select>
            </label>
            <label className="text-sm font-bold text-navy">
              Consumer share (bps)
              <input
                value={ruleForm.share_bps}
                onChange={(e) => setRuleForm((f) => ({ ...f, share_bps: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
              />
            </label>
            <label className="text-sm font-bold text-navy">
              Min commission (minor)
              <input
                value={ruleForm.min_commission_minor}
                onChange={(e) => setRuleForm((f) => ({ ...f, min_commission_minor: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
              />
            </label>
            <button
              type="button"
              onClick={() => void onCreateRule()}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-white"
            >
              Nieuwe rule-versie
            </button>
          </div>
          <ul className="divide-y divide-blue-50">
            {rules.map((r) => (
              <li key={String(r.version)} className="py-2 text-sm">
                <span className="font-extrabold text-navy">v{String(r.version)}</span> · {String(r.unit)} ·{" "}
                {String(r.share_bps)} bps · {r.active ? "active" : "inactive"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminListPage>
  );
}

export default function AdminAffiliatePage() {
  return (
    <Suspense fallback={<p className="p-8">Laden…</p>}>
      <AffiliateConsole />
    </Suspense>
  );
}
