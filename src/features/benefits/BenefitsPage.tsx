"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import SessionGate from "@/features/auth/components/SessionGate";
import Icon from "@/features/dashboard/components/DashboardIcon";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";
import { api, ApiError } from "@/lib/api";
import { formatEuro } from "@/fixtures/dummy";
import SupportChatPanel from "./SupportChatPanel";
import type { Envelope, LedgerRow, VoucherCard, WalletSummary } from "./types";

const euroMinor = (n: number) => formatEuro(n / 100);

function statusLabel(status: string) {
  const key = status.toUpperCase();
  if (key === "ACTIVE" || key === "ISSUED") return { label: "Actief", tone: "text-emerald-700 bg-emerald-50" };
  if (key === "USED" || key === "REDEEMED") return { label: "Gebruikt", tone: "text-slate-600 bg-slate-100" };
  if (key === "EXPIRED") return { label: "Verlopen", tone: "text-slate-500 bg-slate-100" };
  if (key === "CANCELLED") return { label: "Geannuleerd", tone: "text-slate-500 bg-slate-100" };
  return { label: status, tone: "text-muted bg-blue-50" };
}

function discountTitle(v: VoucherCard) {
  if (v.discount_type === "percentage" && v.discount_value != null) return `${v.discount_value}% korting`;
  if (v.discount_type === "fixed" && v.discount_value != null) {
    const minor = Number(v.discount_value) >= 100 ? Number(v.discount_value) : Number(v.discount_value) * 100;
    return `${euroMinor(minor)} korting`;
  }
  return v.title || "Voucher";
}

function discountMeta(v: VoucherCard) {
  const min = v.minimum_order_minor ?? v.min_order_minor;
  const max = v.maximum_discount_minor ?? v.max_discount_minor;
  const parts: string[] = [];
  if (min != null) parts.push(`vanaf ${euroMinor(min)}`);
  if (max != null) parts.push(`max. ${euroMinor(max)}`);
  return parts.join(" · ");
}

function Benefits() {
  const { copyCode, justCopied, refreshWallet, pushToast } = useShopBonus();
  const [tab, setTab] = useState<"vouchers" | "transactions">("vouchers");
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [vouchers, setVouchers] = useState<VoucherCard[]>([]);
  const [txFilter, setTxFilter] = useState("all");
  const [txPage, setTxPage] = useState(1);
  const [transactions, setTransactions] = useState<LedgerRow[]>([]);
  const [txMeta, setTxMeta] = useState<Envelope<LedgerRow[]>["meta"]>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<VoucherCard | null>(null);
  const [supportFor, setSupportFor] = useState<string | null>(null);
  const [termsFor, setTermsFor] = useState<VoucherCard | null>(null);

  const loadWallet = useCallback(async () => {
    const res = await api<Envelope<WalletSummary>>("me/wallet");
    setWallet(res.data);
    await refreshWallet();
  }, [refreshWallet]);

  const loadVouchers = useCallback(async () => {
    const res = await api<Envelope<VoucherCard[]>>("consumer/vouchers?filter=all");
    setVouchers(res.data || []);
  }, []);

  const loadTx = useCallback(async () => {
    const q = new URLSearchParams({ page: String(txPage), per_page: "25" });
    if (txFilter !== "all") q.set("filter", txFilter);
    const res = await api<Envelope<LedgerRow[]>>("consumer/wallet/transactions?" + q.toString());
    setTransactions(res.data || []);
    setTxMeta(res.meta);
  }, [txFilter, txPage]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadWallet(), loadVouchers(), loadTx()]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kon je voordelen niet laden.");
    } finally {
      setLoading(false);
    }
  }, [loadTx, loadVouchers, loadWallet]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    void loadTx().catch((e) => setError(e instanceof ApiError ? e.message : "Transacties laden mislukt."));
  }, [loadTx]);

  const available = wallet?.available_minor ?? wallet?.balances?.eur_credit?.available ?? 0;
  const earned = wallet?.total_earned_minor ?? wallet?.balances?.eur_credit?.total_earned ?? 0;
  const spent = wallet?.total_spent_minor ?? wallet?.balances?.eur_credit?.total_spent ?? 0;
  const recent = useMemo(() => transactions.slice(0, 5), [transactions]);
  const goal = wallet?.savings_goal;

  async function reveal(id: string) {
    try {
      const res = await api<Envelope<VoucherCard>>("consumer/vouchers/" + id);
      setDetail(res.data);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Voucherdetails niet beschikbaar.");
    }
  }

  return (
    <div className="relative overflow-hidden bg-mist">
      <div className="page-blob left-[-120px] top-[-80px] h-[22rem] w-[22rem] bg-sky-100/80" />
      <div className="page-blob right-[-140px] top-[180px] h-[24rem] w-[24rem] bg-blue-100/70" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand">Jouw tegoed. Jouw voordeel.</p>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-black tracking-tight text-navy sm:text-5xl">Mijn voordelen</h1>
            <p className="mt-3 text-base text-muted sm:text-lg">
              Gebruik je ShopBonus-tegoed voor exclusieve kortingsvouchers bij honderden webshops.
            </p>
          </div>
          <div className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-blue-100">
            <button
              type="button"
              onClick={() => setTab("vouchers")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition ${tab === "vouchers" ? "bg-brand text-white" : "text-navy hover:bg-blue-50"}`}
            >
              <Icon name="ticket" size={18} /> Mijn vouchers
            </button>
            <button
              type="button"
              onClick={() => setTab("transactions")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition ${tab === "transactions" ? "bg-brand text-white" : "text-navy hover:bg-blue-50"}`}
            >
              <Icon name="list" size={18} /> Transacties
            </button>
          </div>
        </div>

        {error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            {tab === "vouchers" && (
              <>
                {loading && <p className="text-muted">Vouchers laden…</p>}
                {!loading && vouchers.length === 0 && (
                  <section className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-blue-100">
                    <h2 className="text-xl font-extrabold text-navy">Nog geen vouchers</h2>
                    <p className="mt-2 text-muted">Ontdek webshops en wissel ShopBonus-tegoed in voor korting.</p>
                    <Link href="/webshops" className="primary-button mt-5 inline-flex">Bekijk webshops</Link>
                  </section>
                )}
                {vouchers.map((v) => {
                  const st = statusLabel(v.status);
                  const usable = !!v.can_copy_code || v.status === "ACTIVE" || v.status_raw === "issued";
                  const code = detail?.id === v.id ? detail.code : null;
                  return (
                    <article key={v.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-blue-100">
                      <div className="grid gap-0 sm:grid-cols-[180px_minmax(0,1fr)]">
                        <div className="relative min-h-[140px] bg-gradient-to-br from-blue-50 to-sky-100 p-5">
                          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, #fff, transparent 55%)" }} />
                          <div className="relative flex h-full flex-col justify-between">
                            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-sm font-black text-navy shadow-sm">
                              {(v.merchant_name || v.webshop?.name || "?").slice(0, 2)}
                            </div>
                            <p className="text-sm font-bold text-navy">{v.merchant_name || v.webshop?.name}</p>
                          </div>
                        </div>
                        <div className="p-5 sm:p-6">
                          <div className="flex flex-wrap gap-2">
                            {(v.webshop?.categories || []).slice(0, 3).map((c) => (
                              <span key={c} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-brand">{c}</span>
                            ))}
                          </div>
                          <h3 className="mt-3 text-xl font-extrabold text-navy">{discountTitle(v)}</h3>
                          <p className="mt-1 text-sm text-muted">{discountMeta(v)}</p>
                          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold ${st.tone}`}>
                              <span className={`h-2 w-2 rounded-full ${usable ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {st.label}
                            </span>
                            <span className="text-muted">
                              {usable && v.days_left != null
                                ? `Geldig nog ${v.days_left} dagen${v.expires_at ? ` (t/m ${new Date(v.expires_at).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" })})` : ""}`
                                : v.expires_at
                                  ? `Verlopen op ${new Date(v.expires_at).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" })}`
                                  : ""}
                            </span>
                          </div>
                          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className={`flex flex-1 items-center justify-between rounded-2xl px-4 py-3 font-mono text-sm ${usable ? "bg-slate-50 text-navy" : "bg-slate-100 text-slate-400"}`}>
                              <span>{code || v.code_masked || "••••"}</span>
                              {justCopied && code && justCopied === code && <span className="text-xs font-bold text-emerald-600">Gekopieerd</span>}
                            </div>
                            <button
                              type="button"
                              disabled={!usable}
                              className="primary-button disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={async () => {
                                if (!usable) return;
                                if (!code) await reveal(v.id);
                                const revealed = detail?.id === v.id ? detail.code : (await api<Envelope<VoucherCard>>("consumer/vouchers/" + v.id)).data.code;
                                if (revealed) {
                                  setDetail((d) => (d?.id === v.id ? { ...d, code: revealed } : { ...v, code: revealed }));
                                  await copyCode(revealed);
                                }
                              }}
                            >
                              Kopieer code
                            </button>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
                            <button type="button" className="text-brand" onClick={async () => { await reveal(v.id); setTermsFor((await api<Envelope<VoucherCard>>("consumer/vouchers/" + v.id)).data); }}>
                              Bekijk voorwaarden
                            </button>
                            <button type="button" className="inline-flex items-center gap-2 text-brand" onClick={() => setSupportFor(v.id)}>
                              <Icon name="chat" size={16} /> Probleem met code?
                            </button>
                            {v.gift_supported && (
                              <button type="button" className="inline-flex items-center gap-2 text-brand" onClick={() => pushToast({ title: "Cadeau", message: "Cadeau versturen is voor deze voucher beschikbaar via de webshop.", kind: "info" })}>
                                Cadeau doen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </>
            )}

            {tab === "transactions" && (
              <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-blue-100 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-extrabold text-navy">Transacties</h2>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["all", "Alles"],
                      ["earned", "Verdiend"],
                      ["spent", "Besteed"],
                      ["adjustments", "Correcties"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setTxFilter(value); setTxPage(1); }}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${txFilter === value ? "bg-brand text-white" : "bg-blue-50 text-navy"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <ul className="mt-5 divide-y divide-blue-50">
                  {transactions.map((t) => {
                    const credit = (t.amount_minor ?? t.amount) >= 0;
                    return (
                      <li key={t.id} className="flex items-start justify-between gap-4 py-4">
                        <div className="flex gap-3">
                          <span className={`mt-0.5 grid h-9 w-9 place-items-center rounded-full text-sm font-black ${credit ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {credit ? "+" : "−"}
                          </span>
                          <div>
                            <p className="font-bold text-navy">{t.title || t.description || t.type}</p>
                            <p className="text-sm text-muted">{t.subtitle || t.merchant_name || ""}</p>
                            <p className="mt-1 text-xs text-muted">{new Date(t.created_at).toLocaleString("nl-NL")}</p>
                          </div>
                        </div>
                        <p className={`shrink-0 font-extrabold ${credit ? "text-emerald-700" : "text-rose-700"}`}>
                          {credit ? "+ " : "− "}
                          {euroMinor(Math.abs(t.amount_minor ?? t.amount))}
                        </p>
                      </li>
                    );
                  })}
                  {transactions.length === 0 && <li className="py-8 text-center text-muted">Geen transacties voor deze filter.</li>}
                </ul>
                {txMeta && txMeta.last_page > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <button type="button" disabled={txPage <= 1} className="font-bold text-brand disabled:opacity-40" onClick={() => setTxPage((p) => p - 1)}>Vorige</button>
                    <span className="text-muted">Pagina {txMeta.current_page} / {txMeta.last_page}</span>
                    <button type="button" disabled={txPage >= txMeta.last_page} className="font-bold text-brand disabled:opacity-40" onClick={() => setTxPage((p) => p + 1)}>Volgende</button>
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-blue-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-muted">Mijn ShopBonus-tegoed</p>
                  <p className="mt-2 text-4xl font-black tracking-tight text-navy">{euroMinor(available)}</p>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-brand"><Icon name="wallet" size={26} /></span>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-mist px-3 py-3">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">Beschikbaar</dt>
                  <dd className="mt-1 text-lg font-extrabold text-navy">{euroMinor(available)}</dd>
                </div>
                <div className="rounded-2xl bg-mist px-3 py-3">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">Totaal verdiend</dt>
                  <dd className="mt-1 text-lg font-extrabold text-navy">{euroMinor(earned)}</dd>
                </div>
                <div className="col-span-2 rounded-2xl bg-mist px-3 py-3">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">Totaal besteed</dt>
                  <dd className="mt-1 text-lg font-extrabold text-navy">{euroMinor(spent)}</dd>
                </div>
              </dl>
              {goal && goal.target_minor > 0 && (
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-xs font-bold text-muted">
                    <span>{euroMinor(Math.min(available, goal.target_minor))} van {euroMinor(goal.target_minor)}</span>
                    <span>{Math.min(100, Math.round((available / goal.target_minor) * 100))}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-blue-50">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.round((available / goal.target_minor) * 100))}%` }} />
                  </div>
                </div>
              )}
              <p className="mt-4 text-xs text-muted">Alleen te gebruiken voor kortingsvouchers. Niet opneembaar als geld.</p>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-blue-100">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-extrabold text-navy">Recente walletactiviteit</h2>
                <button type="button" className="text-sm font-bold text-brand" onClick={() => setTab("transactions")}>Alle transacties</button>
              </div>
              <ul className="space-y-3">
                {recent.map((t) => {
                  const credit = (t.amount_minor ?? t.amount) >= 0;
                  return (
                    <li key={t.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="flex gap-2">
                        <span className={`mt-0.5 grid h-7 w-7 place-items-center rounded-full text-xs font-black ${credit ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{credit ? "+" : "−"}</span>
                        <div>
                          <p className="font-semibold text-navy">{t.title || t.type}</p>
                          <p className="text-xs text-muted">{t.subtitle || new Date(t.created_at).toLocaleDateString("nl-NL")}</p>
                        </div>
                      </div>
                      <span className={`font-bold ${credit ? "text-emerald-700" : "text-rose-700"}`}>{credit ? "+" : "−"} {euroMinor(Math.abs(t.amount_minor ?? t.amount))}</span>
                    </li>
                  );
                })}
                {recent.length === 0 && <li className="text-sm text-muted">Nog geen activiteit.</li>}
              </ul>
            </section>

            <Link href="/webshops" className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-brand to-blue-600 p-5 text-white shadow-sm transition hover:brightness-105">
              <div>
                <p className="font-extrabold">Meer voordeel?</p>
                <p className="mt-1 text-sm text-blue-50">Ontdek nieuwe webshops en verdien meer ShopBonus-tegoed.</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20"><Icon name="arrow" size={18} /></span>
            </Link>
          </aside>
        </div>
      </div>

      {termsFor && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-extrabold text-navy">Voorwaarden</h2>
              <button type="button" className="text-brand" onClick={() => setTermsFor(null)}>Sluiten</button>
            </div>
            <p className="mt-3 text-sm text-muted">{String((termsFor.terms?.public_description as string | undefined) || termsFor.summary || termsFor.instructions || "Geen aanvullende voorwaarden.")}</p>
            {termsFor.website_url && <a className="mt-4 inline-block font-bold text-brand" href={termsFor.website_url} target="_blank" rel="noreferrer">Naar webshop →</a>}
          </div>
        </div>
      )}
      {supportFor && <SupportChatPanel voucherId={supportFor} onClose={() => setSupportFor(null)} />}
    </div>
  );
}

export default function BenefitsPage() {
  return <SessionGate><Benefits /></SessionGate>;
}
