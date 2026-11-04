"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSupportSettingsCopy } from "@/i18n/supportSettingsCopy";
import DashboardShell from "@/components/DashboardShell";
import { ApiError } from "@/lib/api";
import {
  DEFAULT_SUPPORT_POLICY,
  createSupportPolicyDraft,
  fetchAiOperations,
  fetchAiReviews,
  fetchPlatformSettings,
  publishSettingVersion,
  rollbackSettingVersion,
  submitSettingForReview,
  testSupportPolicy,
  type OperationsMetrics,
  type PlatformSettingVersion,
  type ReviewListItem,
  type SupportAiPolicy,
} from "@/lib/aiSupportAdmin";

function errorKey(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  if (err.code?.startsWith("support_model_") || err.code === "support_fallback_invalid") return "Verify configured primary and fallback models before publishing.";
  if (err.status === 401 || err.status === 419) return "Your session expired. Sign in again.";
  if (err.status === 403) return "Administrator authorization or additional verification is required.";
  if (err.status === 422) return "Check the settings against the allowed values and limits.";
  if (err.status === 409) return "The policy cannot be changed in its current state. Refresh and check review requirements.";
  if (err.status === 429) return "Too many requests. Try again shortly.";
  return fallback;
}

type Tab = "general" | "provider" | "restrictions" | "quality" | "operations";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "Behavior" },
  { id: "restrictions", label: "Rules" },
  { id: "provider", label: "OpenAI" },
  { id: "quality", label: "Quality" },
  { id: "operations", label: "Monitoring" },
];

function asPolicy(value: unknown): SupportAiPolicy {
  return { ...DEFAULT_SUPPORT_POLICY, ...(typeof value === "object" && value ? value : {}) } as SupportAiPolicy;
}

export default function AiSupportSettingsPage() {
  const t = useSupportSettingsCopy();
  const [tab, setTab] = useState<Tab>("general");
  const [policy, setPolicy] = useState<SupportAiPolicy>(DEFAULT_SUPPORT_POLICY);
  const [versions, setVersions] = useState<PlatformSettingVersion[]>([]);
  const [publishedVersion, setPublishedVersion] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [ops, setOps] = useState<OperationsMetrics | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [testReport, setTestReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [settings, operations, openReviews] = await Promise.all([
      fetchPlatformSettings("support.ai"),
      fetchAiOperations().catch(() => null),
      fetchAiReviews("open").catch(() => []),
    ]);
    setVersions(settings.data || []);
    setPublishedVersion(settings.published?.versions?.["support.ai"] ?? null);
    const publishedValue = settings.published?.values?.["support.ai"];
    if (publishedValue) setPolicy(asPolicy(publishedValue));
    const draft = (settings.data || []).find((v) => v.status === "draft" || v.status === "review");
    if (draft) {
      setDraftId(draft.id);
      setPolicy(asPolicy(draft.value));
    } else {
      setDraftId(null);
    }
    setOps(operations);
    setReviews(openReviews);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch((err) => setError(errorKey(err, "Laden mislukt."))); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const setField = <K extends keyof SupportAiPolicy>(key: K, value: SupportAiPolicy[K]) => {
    setPolicy((p) => ({ ...p, [key]: value }));
  };

  const saveDraft = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createSupportPolicyDraft(policy, reason.trim() || t("Update AI support policy"));
      setDraftId(created.id);
      setNotice(`${t("Draft saved")} (${created.id}).`);
      await load();
    } catch (err) {
      setError(errorKey(err, "Opslaan mislukt."));
    } finally {
      setBusy(false);
    }
  };

  const runTest = async () => {
    if (!draftId) {
      setError(t("Sla eerst een draft op voordat je test."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const report = await testSupportPolicy(draftId);
      setTestReport(`${report.passed}/${report.total} ${t("intent regressions passed")} (${t("failed")}: ${report.failed}).`);
    } catch (err) {
      setError(errorKey(err, "Test mislukt."));
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (!draftId) return;
    setBusy(true);
    try {
      await submitSettingForReview(draftId);
      setNotice(t("Draft ingediend voor review."));
      await load();
    } catch (err) {
      setError(errorKey(err, "Indienen mislukt."));
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!draftId) return;
    setBusy(true);
    try {
      await publishSettingVersion(draftId);
      setNotice(t("Policy gepubliceerd."));
      await load();
    } catch (err) {
      setError(errorKey(err, "Publiceren mislukt (step-up/OTP of tweede admin vereist)."));
    } finally {
      setBusy(false);
    }
  };

  const rollback = async () => {
    if (!publishedVersion) return;
    setBusy(true);
    try {
      await rollbackSettingVersion(publishedVersion, t("Rollback AI support policy from settings UI"));
      setNotice(t("Rollback-draft aangemaakt vanaf gepubliceerde versie."));
      await load();
    } catch (err) {
      setError(errorKey(err, "Rollback mislukt."));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (tab !== "operations") return;
    let cancelled = false;
    const refresh = async () => {
      try { const data = await fetchAiOperations(filters); if (!cancelled) setOps(data); }
      catch (err) { if (!cancelled) { setOps(null); setError(errorKey(err, "Monitoring unavailable.")); } }
    };
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [tab, filters]);

  const verifiedPct = useMemo(() => {
    if (!ops?.statuses) return null;
    const total = Object.values(ops.statuses).reduce((a, b) => a + b, 0) || 0;
    if (!total) return null;
    const verified = (ops.statuses.VERIFIED || 0) + (ops.statuses.PARTIALLY_VERIFIED || 0);
    return Math.round((verified / total) * 100);
  }, [ops]);

  return (
    <DashboardShell admin>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm font-extrabold text-brand hover:underline">
            {t("← Terug naar Cockpit")}
          </Link>
          <h1 className="mt-2 text-2xl font-black text-navy">{t("AI Support-instellingen")}</h1>
          <p className="text-sm text-muted">
            {t("Published version")}: <code className="font-mono text-xs">{publishedVersion || "default-disabled"}</code>
            {draftId ? (
              <>
                {" "}
                · {t("Draft")}: <code className="font-mono text-xs">{draftId}</code>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void saveDraft()} className="rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50">
            {t("Draft opslaan")}
          </button>
          <button type="button" disabled={busy || !draftId} onClick={() => void runTest()} className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-navy disabled:opacity-50">
            {t("Test configuration")}
          </button>
          <button type="button" disabled={busy || !draftId} onClick={() => void submitReview()} className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-navy disabled:opacity-50">
            {t("Indienen")}
          </button>
          <button type="button" disabled={busy || !draftId} onClick={() => void publish()} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 disabled:opacity-50">
            {t("Publiceren")}
          </button>
          <button type="button" disabled={busy || !publishedVersion} onClick={() => void rollback()} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 disabled:opacity-50">
            {t("Rollback")}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{t(error)}</p>}
      {notice && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p>}
      {testReport && <p className="mb-3 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-navy">{testReport}</p>}

      <div className="mb-4 flex flex-wrap gap-2 border-b border-blue-100 pb-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              tab === item.id ? "bg-brand text-white" : "bg-white text-navy border border-blue-100"
            }`}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
        <label className="mb-4 block text-sm font-bold text-navy">
          {t("Wijzigingsreden")}
          <input
            className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2 text-sm font-medium"
            value={reason}
            placeholder={t("Update AI support policy")}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>

        {tab === "general" && (
          <div className="space-y-8">
            <section>
              <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-navy/80">{t("Behavior")}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">{t("Languages")}
                  <select multiple aria-label={t("Languages")} value={policy.languages} onChange={(event) => setField("languages", Array.from(event.target.selectedOptions, (option) => option.value))} className="block rounded-xl border p-2"><option value="en">{t("English")}</option><option value="nl">{t("Nederlands")}</option></select>
                </label>
                <Toggle label="Chat enabled" checked={policy.enabled} onChange={(v) => setField("enabled", v)} />
                <Select
                  disabled label="Default language"
                  value={policy.default_language || "nl"}
                  options={["nl", "en"]}
                  onChange={(v) => setField("default_language", v)}
                />
                <Select
                  label="Tone"
                  value={policy.tone || "friendly_professional"}
                  options={["friendly_professional", "direct", "warm"]}
                  onChange={(v) => setField("tone", v)}
                />
                <Select
                  label="Empathy"
                  value={policy.empathy || "balanced"}
                  options={["minimal", "balanced", "high"]}
                  onChange={(v) => setField("empathy", v)}
                />
                <Select
                  label="Answer detail"
                  value={policy.answer_detail || "concise"}
                  options={["concise", "detailed"]}
                  onChange={(v) => setField("answer_detail", v)}
                />
                <NumberField min={20} max={200} label="Target answer words" value={policy.target_answer_words ?? 45} onChange={(v) => setField("target_answer_words", v)} />
                <NumberField min={25} max={300} label="Max answer words" value={policy.max_answer_words ?? 120} onChange={(v) => setField("max_answer_words", v)} />
                <NumberField disabled label="Max clarification questions" value={policy.max_clarification_questions ?? 1} onChange={(v) => setField("max_clarification_questions", v)} />
                <NumberField min={0} max={1} label="Max automatic research retries" value={policy.max_research_retries ?? 1} onChange={(v) => setField("max_research_retries", v)} />
                <Toggle label="Show progress updates" checked={!!policy.show_progress_updates} onChange={(v) => setField("show_progress_updates", v)} />
                <Toggle label="Show verified badge" checked={!!policy.show_verified_badge} onChange={(v) => setField("show_verified_badge", v)} />
                <Toggle label="Suggest relevant actions" checked={!!policy.suggest_relevant_actions} onChange={(v) => setField("suggest_relevant_actions", v)} />
                <Select
                  disabled label="Human escalation"
                  value={policy.human_escalation || "enabled"}
                  options={["enabled", "disabled"]}
                  onChange={(v) => setField("human_escalation", v)}
                />
              </div>
            </section>
          </div>
        )}
        {tab === "provider" && (
          <div>
            <section>
              <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-navy/80">{t("OpenAI")}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Model" value={policy.model || ""} onChange={(v) => setField("model", v || null)} />
                <Select
                  disabled label="Reasoning effort"
                  value={policy.reasoning_effort || "medium"}
                  options={["low", "medium", "high"]}
                  onChange={(v) => setField("reasoning_effort", v)}
                />
                <Select
                  disabled label="Response verbosity"
                  value={policy.text_verbosity || "low"}
                  options={["low", "medium", "high"]}
                  onChange={(v) => setField("text_verbosity", v)}
                />
                <NumberField min={256} max={4000} label="max_output_tokens" value={policy.max_output_tokens ?? 1200} onChange={(v) => setField("max_output_tokens", v)} />
                <Select
                  disabled label="tool_choice"
                  value={policy.tool_choice || "required"}
                  options={["required", "auto", "none"]}
                  onChange={(v) => setField("tool_choice", v)}
                />
                <Toggle disabled label="parallel_tool_calls" checked={!!policy.parallel_tool_calls} onChange={(v) => setField("parallel_tool_calls", v)} />
                <Toggle disabled label="store" checked={!!policy.store} onChange={(v) => setField("store", v)} />
                <Toggle disabled label="stream (internal only)" checked={!!policy.stream} onChange={(v) => setField("stream", v)} />
                <NumberField min={1000} max={20000} label="response_deadline_ms" value={policy.response_deadline_ms ?? 12000} onChange={(v) => setField("response_deadline_ms", v)} />
                <NumberField disabled label="progress_message_delay_ms" value={policy.progress_message_delay_ms ?? 500} onChange={(v) => setField("progress_message_delay_ms", v)} />
                <NumberField disabled label="max_function_rounds" value={policy.max_function_rounds ?? 3} onChange={(v) => setField("max_function_rounds", v)} />
                <NumberField min={0} max={1000} step={0.000001} label="daily_cost_limit_eur" value={policy.daily_cost_limit_eur ?? 20} onChange={(v) => setField("daily_cost_limit_eur", v)} />
                <TextField label="fallback_model" value={policy.fallback_model || ""} onChange={(v) => setField("fallback_model", v || null)} />
                <NumberField min={5} max={20} label="timeout_seconds" value={policy.timeout_seconds} onChange={(v) => setField("timeout_seconds", v)} />
                <NumberField min={0} max={1000} label="daily_request_limit" value={policy.daily_request_limit} onChange={(v) => setField("daily_request_limit", v)} />
                <p className="sm:col-span-2 text-xs text-muted">
                  {t("Advanced controls use server-owned evidence templates. Deadlines and cost limits remain bounded by deployment settings. Fallback models require current verification before publication. Fixed provider controls await separate capability proof.")}
                </p>
              </div>
            </section>
          </div>
        )}

        {tab === "restrictions" && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {t("Policy restrictions worden server-side afgedwongen. Clientwijzigingen overschrijven backend-restricties nooit.")}
            </p>
            {(policy.restrictions || []).map((r, idx) => (
              <div key={r.rule_code} className="grid gap-2 rounded-2xl border border-blue-50 bg-mist/40 p-4 sm:grid-cols-4">
                <TextField
                  label="rule_code"
                  value={r.rule_code}
                  onChange={(v) => {
                    const next = [...policy.restrictions];
                    next[idx] = { ...next[idx], rule_code: v };
                    setField("restrictions", next);
                  }}
                />
                <Select
                  label="action"
                  value={r.action}
                  options={["BLOCK", "REWRITE", "ESCALATE", "REVIEW"]}
                  onChange={(v) => {
                    const next = [...policy.restrictions];
                    next[idx] = { ...next[idx], action: v };
                    setField("restrictions", next);
                  }}
                />
                <Select
                  label="scope"
                  value={r.scope || "ALL"}
                  options={["ALL", "CONSUMER", "WORKSPACE"]}
                  onChange={(v) => {
                    const next = [...policy.restrictions];
                    next[idx] = { ...next[idx], scope: v };
                    setField("restrictions", next);
                  }}
                />
                <Toggle
                  label="enabled"
                  checked={r.enabled}
                  onChange={(v) => {
                    const next = [...policy.restrictions];
                    next[idx] = { ...next[idx], enabled: v };
                    setField("restrictions", next);
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="rounded-xl border border-dashed border-brand/40 px-4 py-2 text-sm font-bold text-brand"
              onClick={() =>
                setField("restrictions", [
                  ...policy.restrictions,
                  {
                    rule_code: "NO_REFUND_PROMISE",
                    match_type: "semantic_claim",
                    action: "BLOCK",
                    enabled: true,
                    scope: "ALL",
                  },
                ])
              }
            >
              {t("+ Regel toevoegen")}
            </button>
          </div>
        )}

        {tab === "quality" && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {t("FAQ-kennis voor AI-antwoorden wordt beheerd in Content Studio. Gepubliceerde FAQ-items worden gebruikt naast geverifieerde accountdata.")}
            </p>
            <Link href="/admin/cms/faq" className="inline-flex text-sm font-extrabold text-brand">
              {t("FAQ beheren in CMS →")}
            </Link>
            <div>
              <h3 className="text-sm font-extrabold text-navy">{t("Versiegeschiedenis")}</h3>
              <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-muted">
                {versions.map((v) => (
                  <li key={v.id}>
                    <code>{v.id}</code> · {t(v.status)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "quality" && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {t("Negatieve feedback komt in de review-wachtrij. Correcties vereisen Super Admin-goedkeuring en een regressietest.")}
            </p>
            <Link href="/admin/support" className="inline-flex text-sm font-extrabold text-brand">
              {t("Open review-wachtrij →")}
            </Link>
            <ul className="divide-y divide-blue-50">
              {reviews.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-mono text-xs">{r.id}</span>
                  <span className="text-muted">{r.trigger}</span>
                  <Link href={`/admin/support?review=${r.id}`} className="font-bold text-brand">
                    {t("Inspecteren")}
                  </Link>
                </li>
              ))}
              {reviews.length === 0 && <li className="py-4 text-sm text-muted">{t("Geen open reviews.")}</li>}
            </ul>
          </div>
        )}

        {tab === "operations" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-3">
              {["from", "to", "model"].map((key) => <label key={key}>{t(key)}<input aria-label={t(key)} type={key === "model" ? "text" : "datetime-local"} value={filters[key] || ""} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))} className="block rounded border p-2" /></label>)}
              {Object.entries({ scope: ["consumer", "workspace"], locale: ["en", "nl"], status: ["VERIFIED", "PARTIALLY_VERIFIED", "NEEDS_CLARIFICATION", "ESCALATED", "UNAVAILABLE", "PENDING", "RESEARCHING", "VERIFYING", "RETRYING"], retry_used: ["0", "1"], outcome: ["CONFIRMED_ERROR", "ANSWER_CORRECT", "NEEDS_INVESTIGATION"] }).map(([key, values]) => <label key={key}>{t(key)}<select aria-label={t(key)} className="block rounded border p-2" value={filters[key] || ""} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}><option value="">{t("All")}</option>{values.map((v) => <option key={v} value={v}>{t(v)}</option>)}</select></label>)}
            </div>
            {!ops && <p className="text-sm text-muted">{t("Geen operations-data.")}</p>}
            {ops && (
              <>
                <Metric label="Sample requests" value={String(ops.sample_size)} />
                <Metric label="Verified %" value={verifiedPct === null ? "—" : `${verifiedPct}%`} />
                {Object.entries(ops.outcome_percentages ?? {}).map(([status, percentage]) => <Metric key={status} label={status} value={String(percentage) + "%"} />)}
                <Metric label="Retries" value={String(ops.retrieval_retries)} />
                <Metric label="Escalations / open reviews" value={String(ops.open_reviews)} />
                <Metric label="P95 latency (ms)" value={ops.latency_p95_ms === null ? "—" : String(ops.latency_p95_ms)} />
                <Metric label="Input tokens" value={String(ops.input_tokens)} />
                <Metric label="Output tokens" value={String(ops.output_tokens)} />
                <Metric label="Daily requests" value={String(ops.daily_requests)} />
                <Metric label="Broadcaster" value={ops.broadcaster} />
                <Metric label="Live Reverb probe" value={t(String(ops.connectivity?.reverb_live_probe ?? "not_measured"))} />
                <Metric label="Probe checked at" value={String(ops.connectivity?.reverb_probe_checked_at ?? "—")} />
                <Metric label="Probe round-trip latency (ms)" value={String(ops.connectivity?.reverb_probe_latency_ms ?? "—")} />
                <Metric label="Last broadcast dispatch attempt" value={ops.last_successful_broadcast_at || "—"} />
                <Metric label="Broadcast failures 24u" value={String(ops.broadcast_failures_last_24h)} />
                <Metric label="Circuit open" value={ops.circuit_open ? t("yes") : t("no")} />
                <Metric label="Matching requests / sample" value={String(ops.matching_total ?? ops.sample_size) + " / " + ops.sample_size} />
                <Metric label="Estimated provider cost (EUR)" value={ops.provider_cost == null ? t("Unavailable") : String(ops.provider_cost)} />
                <Metric label="Requests with priced usage" value={String(ops.costed_requests ?? 0) + " / " + ops.sample_size} />
                <Metric label="Policy version" value={ops.policy_version} />
                <p className="sm:col-span-2 lg:col-span-3 text-xs text-muted">{t("Cost is estimated from configured EUR rates. Unpriced requests and billed costs are unavailable; failed or fallback usage may be missing.")}</p>
                <pre className="sm:col-span-2 lg:col-span-3 overflow-auto rounded-xl bg-slate-50 p-3 text-xs">
                  {JSON.stringify({ outcome_percentages: ops.outcome_percentages, statuses: ops.statuses, failures: ops.failures, connectivity: ops.connectivity }, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}


function Toggle({ label, checked, onChange, disabled = false }: { disabled?: boolean; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const t = useSupportSettingsCopy();
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-blue-50 px-3 py-2 text-sm font-bold text-navy">
      {t(label)}{disabled && ` (${t("Fixed by server policy")})`}
      <input disabled={disabled} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  disabled?: boolean;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const t = useSupportSettingsCopy();
  return (
    <label className="block text-sm font-bold text-navy">
      {t(label)}{disabled && ` (${t("Fixed by server policy")})`}
      <select disabled={disabled} className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2 text-sm font-medium" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {t(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({ label, value, onChange, disabled = false, min, max, step = 1 }: { min?: number; max?: number; step?: number; disabled?: boolean; label: string; value: number; onChange: (v: number) => void }) {
  const t = useSupportSettingsCopy();
  return (
    <label className="block text-sm font-bold text-navy">
      {t(label)}{disabled && ` (${t("Fixed by server policy")})`}
      <input
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        type="number"
        className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2 text-sm font-medium"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function TextField({ label, value, onChange, disabled = false }: { disabled?: boolean; label: string; value: string; onChange: (v: string) => void }) {
  const t = useSupportSettingsCopy();
  return (
    <label className="block text-sm font-bold text-navy">
      {t(label)}{disabled && ` (${t("Fixed by server policy")})`}
      <input disabled={disabled} className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2 text-sm font-medium" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const t = useSupportSettingsCopy();
  return (
    <div className="rounded-2xl border border-blue-50 bg-mist/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t(label)}</p>
      <p className="mt-1 break-all text-lg font-black text-navy">{value}</p>
    </div>
  );
}
