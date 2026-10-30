"use client";

import {
  BANNER_ANCHORS,
  BANNER_TEMPLATES,
  BRANCH_OFFER_PREVIEWS,
  formatMinor,
  merchantCostFromReward,
  templateLabel,
  type BannerAiRun,
  type BannerConfig,
  type BannerSimulation,
} from "@/lib/banners";

type Tab = "design" | "triggers" | "insights";

type Props = {
  tab: Tab;
  onTab: (t: Tab) => void;
  config: BannerConfig;
  onChange: (next: BannerConfig) => void;
  simulation: BannerSimulation | null;
  onSimulate: () => void;
  aiRuns: BannerAiRun[];
  aiBusy: boolean;
  onAiCreate: () => void;
  onAiOptimize: () => void;
  onReviewSuggestion: (runId: string, proposal: number) => void;
  notice: string;
  onClose?: () => void;
};

export default function StudioPanel({
  tab,
  onTab,
  config,
  onChange,
  simulation,
  onSimulate,
  aiRuns,
  aiBusy,
  onAiCreate,
  onAiOptimize,
  onReviewSuggestion,
  notice,
  onClose,
}: Props) {
  const urlTrigger = findTrigger(config.triggers, "url_match");
  const catTrigger = findTrigger(config.triggers, "category");
  const secTrigger = findTrigger(config.triggers, "min_seconds");
  const fashion = BRANCH_OFFER_PREVIEWS[0];
  const fashionCost = merchantCostFromReward(fashion.reward_minor);

  const setContent = (patch: Partial<BannerConfig["content"]>) =>
    onChange({ ...config, content: { ...config.content, ...patch } });
  const setStyle = (patch: Partial<BannerConfig["style"]>) =>
    onChange({ ...config, style: { ...config.style, ...patch } });
  const setPlacement = (patch: Partial<BannerConfig["placement"]>) =>
    onChange({ ...config, placement: { ...config.placement, ...patch } });

  return (
    <aside
      data-testid="studio-panel"
      className="flex h-full w-full max-w-[360px] flex-col border-l border-blue-100 bg-white shadow-xl"
    >
      <header className="flex items-center justify-between border-b border-blue-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-black text-white">
            SB
          </span>
          <div>
            <p className="text-sm font-extrabold text-navy">ShopBonus Studio</p>
            <p className="text-[11px] font-semibold text-muted">Design · Triggers · AI</p>
          </div>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-mist" aria-label="Close">
            ✕
          </button>
        ) : null}
      </header>

      <div className="flex border-b border-blue-50 px-2" role="tablist">
        {(
          [
            ["design", "Design"],
            ["triggers", "Triggers"],
            ["insights", "AI Insights"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            data-testid={`studio-tab-${id}`}
            onClick={() => onTab(id)}
            className={`flex-1 px-2 py-2.5 text-xs font-extrabold ${
              tab === id ? "border-b-2 border-brand text-brand" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "design" && (
          <div className="space-y-3" data-testid="design-tab">
            <Field label="Widget Type">
              <select
                className="w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                value={config.template}
                onChange={(e) => onChange({ ...config, template: e.target.value as BannerConfig["template"] })}
              >
                {BANNER_TEMPLATES.map((t) => (
                  <option key={t} value={t}>
                    {templateLabel(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Position">
              <select
                className="w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                value={config.placement.anchor}
                onChange={(e) => setPlacement({ anchor: e.target.value as BannerConfig["placement"]["anchor"] })}
              >
                {BANNER_ANCHORS.map((a) => (
                  <option key={a} value={a}>
                    {a.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Heading">
              <input className="w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30" value={config.content.heading} onChange={(e) => setContent({ heading: e.target.value })} />
            </Field>
            <Field label="Subtitle">
              <input
                className="w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                value={config.content.subtitle ?? ""}
                onChange={(e) => setContent({ subtitle: e.target.value })}
              />
            </Field>
            <Field label="CTA label">
              <input
                className="w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                value={config.content.cta_label}
                onChange={(e) => setContent({ cta_label: e.target.value })}
              />
            </Field>
            <Field label="CTA URL (https)">
              <input
                className="w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                value={config.content.cta_url}
                onChange={(e) => setContent({ cta_url: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Background">
                <input
                  type="color"
                  className="h-10 w-full cursor-pointer rounded-lg border border-blue-100"
                  value={config.style.background}
                  onChange={(e) => setStyle({ background: e.target.value })}
                />
              </Field>
              <Field label="Text">
                <input
                  type="color"
                  className="h-10 w-full cursor-pointer rounded-lg border border-blue-100"
                  value={config.style.text}
                  onChange={(e) => setStyle({ text: e.target.value })}
                />
              </Field>
              <Field label="Animation">
                <select
                  className="w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                  value={config.style.animation}
                  onChange={(e) => setStyle({ animation: e.target.value as BannerConfig["style"]["animation"] })}
                >
                  <option value="fade_in">Fade in</option>
                  <option value="slide_in">Slide in</option>
                  <option value="none">None</option>
                </select>
              </Field>
            </div>
            <Field label="Devices">
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                {(["desktop", "tablet", "mobile"] as const).map((d) => {
                  const on = config.devices.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        const next = on ? config.devices.filter((x) => x !== d) : [...config.devices, d];
                        if (next.length === 0) return;
                        onChange({ ...config, devices: next });
                      }}
                      className={`rounded-lg px-2.5 py-1.5 ${on ? "bg-brand text-white" : "bg-mist text-navy"}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="rounded-xl border border-blue-100 bg-mist/60 p-3 text-xs font-semibold text-navy">
              <p className="font-extrabold">Branch offer preview</p>
              <p className="mt-1 text-muted">{fashion.note}</p>
              <p className="mt-1">
                Merchant cost: {formatMinor(fashionCost.total_minor)} ({formatMinor(fashionCost.reward_minor)} +{" "}
                {formatMinor(fashionCost.fee_minor)} fee)
              </p>
            </div>
          </div>
        )}

        {tab === "triggers" && (
          <div className="space-y-3" data-testid="triggers-tab">
            <Field label="Appear after">
              <select
                className="w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                value={typeof secTrigger?.value === "number" ? secTrigger.value : 20}
                onChange={(e) =>
                  onChange({
                    ...config,
                    triggers: upsertTrigger(config.triggers, { type: "min_seconds", value: Number(e.target.value) }),
                  })
                }
              >
                {[0, 5, 10, 20, 30, 60].map((s) => (
                  <option key={s} value={s}>
                    {s} sec
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Page URL">
              <input
                className="w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                value={typeof urlTrigger?.value === "string" ? urlTrigger.value : "/collections/*"}
                onChange={(e) =>
                  onChange({
                    ...config,
                    triggers: upsertTrigger(config.triggers, { type: "url_match", value: e.target.value }),
                  })
                }
              />
            </Field>
            <Field label="Category">
              <select
                className="w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                value={Array.isArray(catTrigger?.value) ? String(catTrigger?.value[0] ?? "fashion") : "fashion"}
                onChange={(e) =>
                  onChange({
                    ...config,
                    triggers: upsertTrigger(config.triggers, { type: "category", value: [e.target.value] }),
                  })
                }
              >
                <option value="fashion">Fashion</option>
                <option value="electronics">Electronics</option>
                <option value="home_living">Home & living</option>
              </select>
            </Field>
            <Field label="Animation">
              <select
                className="w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                value={config.style.animation}
                onChange={(e) => setStyle({ animation: e.target.value as BannerConfig["style"]["animation"] })}
              >
                <option value="fade_in">Fade in</option>
                <option value="slide_in">Slide in</option>
                <option value="none">None</option>
              </select>
            </Field>
            <Field label="Frequency">
              <select
                className="w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                value={config.frequency.per_session}
                onChange={(e) =>
                  onChange({
                    ...config,
                    frequency: { ...config.frequency, per_session: Number(e.target.value) },
                  })
                }
              >
                <option value={1}>Once per session</option>
                <option value={2}>Twice per session</option>
                <option value={3}>Three times per session</option>
              </select>
            </Field>
            <button
              type="button"
              onClick={onSimulate}
              className="w-full rounded-xl border border-blue-100 bg-mist px-3 py-2 text-xs font-extrabold text-navy"
            >
              Why shown / hidden (simulate)
            </button>
            {simulation ? (
              <div
                data-testid="simulation-result"
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  simulation.shown ? "border-mint bg-mint text-mint-dark" : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                <p className="font-extrabold">
                  {simulation.shown ? "Would show" : "Would hide"} · simulated
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {simulation.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {simulation.cart_progress ? (
                  <p className="mt-2">
                    Cart {simulation.cart_progress.percent}% · {formatMinor(simulation.cart_progress.remaining_minor)} to go
                  </p>
                ) : null}
                {simulation.fallback === "static_offer" ? (
                  <p className="mt-1 font-bold">Fallback: static truthful offer (no fake progress)</p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {tab === "insights" && (
          <div className="space-y-3" data-testid="insights-tab">
            <p className="text-xs font-semibold text-muted">
              Measured suggestions only. Review creates an editable test — never auto-publishes.
            </p>
            <button
              type="button"
              disabled={aiBusy}
              onClick={onAiCreate}
              className="w-full rounded-xl bg-brand px-3 py-2.5 text-xs font-extrabold text-white disabled:opacity-60"
            >
              AI Create — 2–3 editable designs
            </button>
            <button
              type="button"
              disabled={aiBusy}
              onClick={onAiOptimize}
              className="w-full rounded-xl border border-brand bg-brand-light px-3 py-2.5 text-xs font-extrabold text-brand disabled:opacity-60"
            >
              Analyze my last 1,000 verified orders
            </button>
            {aiRuns.map((run) => (
              <div key={run.id} className="rounded-xl border border-blue-100 bg-mist/50 p-3">
                <p className="text-xs font-extrabold text-navy">
                  {run.kind} · {run.status}
                </p>
                {(run.proposals ?? []).slice(0, 3).map((p, i) => (
                  <div key={i} className="mt-2 rounded-lg bg-white p-2 text-[11px] font-semibold text-muted">
                    <p>
                      #{i + 1} {String(p.anchor ?? p.hypothesis ?? "proposal")}
                      {p.sample_size != null ? ` · n=${String(p.sample_size)}` : ""}
                      {p.estimated_cost_minor != null
                        ? ` · cost ${formatMinor(Number(p.estimated_cost_minor))}`
                        : ""}
                    </p>
                    <button
                      type="button"
                      className="mt-1 text-brand"
                      onClick={() => onReviewSuggestion(run.id, i)}
                    >
                      Review suggestion →
                    </button>
                  </div>
                ))}
              </div>
            ))}
            <div className="rounded-xl border border-brand/20 bg-brand-light p-3 text-xs font-semibold text-navy">
              <p className="font-extrabold">💡 Test this banner on cart pages</p>
              <p className="mt-1 text-muted">
                Based on order patterns, try this reward on cart pages. Run an A/B test to measure impact.
              </p>
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-blue-50 px-4 py-3 text-[11px] font-semibold text-muted">
        <p data-testid="published-notice">ℹ {notice || "Customers see the published version until you launch."}</p>
      </footer>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

function findTrigger(
  root: BannerConfig["triggers"],
  type: string
): { type: string; value?: unknown } | null {
  if ("all" in root && Array.isArray(root.all)) {
    for (const c of root.all) {
      const found = findTrigger(c as BannerConfig["triggers"], type);
      if (found) return found;
    }
  }
  if ("any" in root && Array.isArray(root.any)) {
    for (const c of root.any) {
      const found = findTrigger(c as BannerConfig["triggers"], type);
      if (found) return found;
    }
  }
  if ("type" in root && root.type === type) return root as { type: string; value?: unknown };
  return null;
}

function upsertTrigger(root: BannerConfig["triggers"], next: { type: string; value: unknown }): BannerConfig["triggers"] {
  if ("all" in root && Array.isArray(root.all)) {
    const idx = root.all.findIndex((c) => "type" in c && c.type === next.type);
    const all = [...root.all];
    if (idx >= 0) all[idx] = next;
    else all.push(next);
    return { all };
  }
  return { all: [next] };
}
