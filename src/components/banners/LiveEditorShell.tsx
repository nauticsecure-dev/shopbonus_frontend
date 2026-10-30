"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import BannerWidgetPreview from "@/components/banners/BannerWidgetPreview";
import StudioPanel from "@/components/banners/StudioPanel";
import {
  ApiError,
  EMBED_MSG_SCHEMA,
  defaultBannerConfig,
  fetchBanner,
  fetchBannerAiRun,
  fetchBannerInstallation,
  pauseBanner,
  publishBanner,
  requestBannerAi,
  requestBannerPairing,
  reviewBannerAi,
  rollbackBanner,
  saveBannerDraft,
  scheduleBanner,
  simulateBanner,
  type BannerAiRun,
  type BannerConfig,
  type BannerCampaignDetail,
  type BannerSimulation,
  uploadBannerAsset,
} from "@/lib/banners";

type Device = "desktop" | "mobile";
type LeftTool = "templates" | "text" | "images" | "ai" | null;

type Props = {
  workspaceId: string;
  bannerId: string;
  shopName: string;
};

export default function LiveEditorShell({ workspaceId, bannerId, shopName }: Props) {
  const [banner, setBanner] = useState<BannerCampaignDetail | null>(null);
  const [config, setConfig] = useState<BannerConfig>(defaultBannerConfig());
  const [revision, setRevision] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [tab, setTab] = useState<"design" | "triggers" | "insights">("design");
  const [leftTool, setLeftTool] = useState<LeftTool>("templates");
  const [selected, setSelected] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("Customers see the published version until you launch.");
  const [simulation, setSimulation] = useState<BannerSimulation | null>(null);
  const [aiRuns, setAiRuns] = useState<BannerAiRun[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [history, setHistory] = useState<BannerConfig[]>([]);
  const [future, setFuture] = useState<BannerConfig[]>([]);
  const [pairStatus, setPairStatus] = useState<string>("canvas");
  const [panelOpen, setPanelOpen] = useState(true);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const nonceRef = useRef(crypto.randomUUID());
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const row = await fetchBanner(workspaceId, bannerId, signal);
      if (signal?.aborted) return;
      setBanner(row);
      const cfg = (row.draft_config as BannerConfig) || defaultBannerConfig();
      setConfig(cfg);
      setRevision(row.draft_revision ?? 1);
      setNotice(row.notice || "Customers see the published version until you launch.");
      setDirty(false);
      setHistory([]);
      setFuture([]);
    },
    [workspaceId, bannerId]
  );

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal).catch((err) => {
      if (!ac.signal.aborted) setError(err instanceof ApiError ? err.message : "Could not load banner.");
    });
    return () => ac.abort();
  }, [load]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const pushHistory = (next: BannerConfig) => {
    setHistory((h) => [...h.slice(-29), config]);
    setFuture([]);
    setConfig(next);
    setDirty(true);
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [config, ...f]);
      setConfig(prev);
      setDirty(true);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const [next, ...rest] = f;
      setHistory((h) => [...h, config]);
      setConfig(next);
      setDirty(true);
      return rest;
    });
  };

  const onSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await saveBannerDraft(workspaceId, bannerId, { revision, config, name: banner?.name });
      setBanner(saved);
      setRevision(saved.draft_revision ?? revision + 1);
      setDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const onPublish = async () => {
    if (dirty) await onSave();
    setBusy(true);
    try {
      const row = await publishBanner(workspaceId, bannerId);
      setBanner(row);
      setDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Publish blocked — check funding and permissions.");
    } finally {
      setBusy(false);
    }
  };

  const onPause = async () => {
    setBusy(true);
    try {
      setBanner(await pauseBanner(workspaceId, bannerId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Pause failed.");
    } finally {
      setBusy(false);
    }
  };

  const onSchedule = async () => {
    const raw = window.prompt("Schedule publish (shop-local Y-m-dTH:i)", nextHourLocal());
    if (!raw) return;
    setBusy(true);
    try {
      setBanner(await scheduleBanner(workspaceId, bannerId, raw));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Schedule failed.");
    } finally {
      setBusy(false);
    }
  };

  const onRollback = async () => {
    const v = window.prompt("Rollback to version number");
    if (!v) return;
    setBusy(true);
    try {
      setBanner(await rollbackBanner(workspaceId, bannerId, Number(v)));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rollback failed.");
    } finally {
      setBusy(false);
    }
  };

  const onSimulate = async () => {
    try {
      const cat =
        findCat(config) ||
        "fashion";
      const data = await simulateBanner(workspaceId, bannerId, {
        path: findUrl(config) || "/collections/jurken",
        category: cat,
        seconds: findSeconds(config) ?? 25,
        scroll_pct: 55,
        device,
        cart_total_minor: config.template === "cart_progress" ? 9400 : undefined,
      });
      setSimulation(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Simulation failed.");
    }
  };

  const pollAi = async (runId: string) => {
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const run = await fetchBannerAiRun(workspaceId, bannerId, runId);
        setAiRuns((rows) => rows.map((x) => (x.id === runId ? run : x)));
        if (run.status === "completed" || run.status === "failed" || (run.proposals && run.proposals.length)) {
          return run;
        }
      } catch {
        /* keep polling */
      }
    }
    return null;
  };

  const onAiCreate = async () => {
    setAiBusy(true);
    setTab("insights");
    try {
      const run = await requestBannerAi(workspaceId, bannerId, "designs", crypto.randomUUID());
      setAiRuns((r) => [run, ...r]);
      await pollAi(run.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI Create failed or quota reached.");
    } finally {
      setAiBusy(false);
    }
  };

  const onAiOptimize = async () => {
    setAiBusy(true);
    setTab("insights");
    try {
      const run = await requestBannerAi(workspaceId, bannerId, "insights", crypto.randomUUID());
      setAiRuns((r) => [run, ...r]);
      await pollAi(run.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI Optimize failed or quota reached.");
    } finally {
      setAiBusy(false);
    }
  };

  const onReviewSuggestion = async (runId: string, proposal: number) => {
    try {
      const result = await reviewBannerAi(workspaceId, bannerId, runId, {
        decision: "accept",
        proposal,
        note: "Merchant review — create editable test only; do not publish.",
      });
      if (result.published) {
        setError("Unexpected auto-publish blocked by policy.");
      } else {
        setNotice(
          result.draft_campaign
            ? `Editable test draft ${result.draft_campaign} created. Publish remains manual.`
            : "Suggestion reviewed. No auto-publish."
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Review failed.");
    }
  };

  const openOnWebsite = async () => {
    setError(null);
    try {
      const installation = await fetchBannerInstallation(workspaceId);
      const origin = installation.allowed_origins[0];
      if (!origin) {
        setPairStatus("fallback");
        setError("Add an allowed origin in Installation before editing on your website.");
        return;
      }
      const pairing = await requestBannerPairing(workspaceId, origin);
      setPairStatus("pairing");
      const win = window.open(origin, "shopbonus-live-editor");
      if (!win) {
        setPairStatus("fallback");
        setError("Popup blocked — design on the canvas below (safe fallback).");
        return;
      }
      const onMsg = (ev: MessageEvent) => {
        const data = ev.data;
        if (!data || data.schema !== EMBED_MSG_SCHEMA || data.nonce !== nonceRef.current) return;
        if (data.type === "editor.ready") {
          win.postMessage(
            {
              schema: EMBED_MSG_SCHEMA,
              type: "editor.pair",
              nonce: nonceRef.current,
              key: installation.public_key,
              pairing_token: pairing.pairing_token,
              campaign: bannerId,
            },
            origin
          );
        }
        if (data.type === "editor.paired") setPairStatus("paired");
        if (data.type === "editor.pair_failed") {
          setPairStatus("fallback");
          setError(`Pairing failed (${data.code || data.status}). Using canvas fallback.`);
        }
        if (data.type === "banner.moved" && typeof data.offset_x === "number") {
          pushHistory({
            ...config,
            placement: { ...config.placement, offset_x: data.offset_x, offset_y: data.offset_y ?? 0 },
          });
        }
      };
      window.addEventListener("message", onMsg);
      setTimeout(() => {
        win.postMessage(
          { schema: EMBED_MSG_SCHEMA, type: "editor.handshake", nonce: nonceRef.current, key: installation.public_key },
          origin
        );
      }, 800);
    } catch (err) {
      setPairStatus("fallback");
      setError(err instanceof ApiError ? err.message : "Could not open live pairing.");
    }
  };

  const onUpload = async (file: File) => {
    try {
      const asset = await uploadBannerAsset(workspaceId, file);
      pushHistory({ ...config, content: { ...config.content, image_asset_id: asset.id } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Image upload failed.");
    }
  };

  const status = banner?.status ?? "draft";
  const statusTone =
    status === "live" ? "bg-emerald-400" : status === "paused" ? "bg-amber-400" : status === "scheduled" ? "bg-sky-400" : "bg-white/70";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900" data-testid="live-editor">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 bg-[#0b63ee] px-3 text-white shadow-lg md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard/banners" className="rounded-lg bg-white/15 px-2 py-1 text-xs font-bold">
            ← Overview
          </Link>
          <span className="text-sm font-black tracking-tight">ShopBonus</span>
          <span className="hidden truncate text-xs font-semibold text-white/85 sm:inline">{shopName}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide">
            <span className={`h-2 w-2 rounded-full ${statusTone}`} />
            Live Editor · {status}
          </span>
          {dirty ? (
            <span data-testid="unsaved-warning" className="rounded-full bg-amber-300/90 px-2 py-0.5 text-[10px] font-black text-amber-950">
              Unsaved changes
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/12 text-sm font-extrabold disabled:opacity-40" onClick={undo} title="Undo" disabled={!history.length}>
            ↶
          </button>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/12 text-sm font-extrabold disabled:opacity-40" onClick={redo} title="Redo" disabled={!future.length}>
            ↷
          </button>
          <button
            type="button"
            data-testid="device-desktop"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-extrabold ${device === "desktop" ? "bg-white/25" : "bg-white/12"}`}
            onClick={() => setDevice("desktop")}
            aria-label="Desktop preview"
          >
            ▣
          </button>
          <button
            type="button"
            data-testid="device-mobile"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-extrabold ${device === "mobile" ? "bg-white/25" : "bg-white/12"}`}
            onClick={() => setDevice("mobile")}
            aria-label="Mobile preview"
          >
            ▢
          </button>
          <button type="button" className="rounded-xl border border-white/35 px-2.5 py-1.5 text-[11px] font-extrabold" onClick={() => void openOnWebsite()}>
            Preview
          </button>
          <button type="button" className="rounded-xl border border-white/35 px-2.5 py-1.5 text-[11px] font-extrabold" onClick={() => void onSchedule()}>
            Schedule
          </button>
          <button type="button" className="rounded-xl border border-white/35 px-2.5 py-1.5 text-[11px] font-extrabold disabled:opacity-40" onClick={() => void onPause()} disabled={status !== "live"}>
            Pause
          </button>
          <button type="button" className="rounded-xl border border-white/35 px-2.5 py-1.5 text-[11px] font-extrabold" onClick={() => void onRollback()}>
            Rollback
          </button>
          <button
            type="button"
            data-testid="save-draft"
            disabled={busy || !dirty}
            onClick={() => void onSave()}
            className="rounded-xl border border-white/80 bg-transparent px-3 py-1.5 text-xs font-extrabold disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            data-testid="publish-campaign"
            disabled={busy}
            onClick={() => void onPublish()}
            className="rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-[#0b63ee] disabled:opacity-50"
          >
            Publish campaign
          </button>
        </div>
      </header>

      {error ? (
        <div className="bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <div
          className={`absolute left-3 top-3 z-30 flex flex-col gap-2 ${toolsCollapsed ? "sm:flex" : ""}`}
          data-testid="left-tools"
        >
          <button
            type="button"
            className="mb-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-navy shadow md:hidden"
            onClick={() => setToolsCollapsed((v) => !v)}
          >
            Tools
          </button>
          <div className={`${toolsCollapsed ? "hidden md:flex" : "flex"} flex-col gap-2`}>
            {(
              [
                ["templates", "▦", "Templates"],
                ["text", "T", "Text"],
                ["images", "▣", "Images"],
                ["ai", "✦", "AI Create"],
              ] as const
            ).map(([id, icon, label]) => (
              <button
                key={id}
                type="button"
                title={label}
                data-testid={`tool-${id}`}
                onClick={() => {
                  setLeftTool(id);
                  if (id === "ai") void onAiCreate();
                  if (id === "text") setTab("design");
                  if (id === "templates") setTab("design");
                }}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black shadow-lg ${
                  leftTool === id ? "bg-brand text-white" : "bg-white text-navy"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
          {leftTool === "images" ? (
            <label className="mt-1 cursor-pointer rounded-xl bg-white px-2 py-1.5 text-[10px] font-bold text-navy shadow">
              Upload
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUpload(f);
                }}
              />
            </label>
          ) : null}
        </div>

        <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-slate-200 p-3 md:p-6">
          <div
            data-testid="storefront-canvas"
            className={`relative overflow-hidden rounded-2xl bg-white shadow-2xl transition-all ${
              device === "mobile" ? "h-[720px] w-[390px]" : "h-full w-full max-w-6xl"
            }`}
            onClick={() => setSelected(false)}
          >
            <StorefrontChrome shopName={shopName} />
            <div className="relative h-[calc(100%-56px)] bg-gradient-to-br from-stone-100 via-rose-50 to-slate-100">
              <div className="pointer-events-none absolute inset-0 opacity-40">
                <div className="absolute left-[8%] top-[12%] h-[38%] w-[42%] rounded-3xl bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22500%22%3E%3Crect fill=%22%23d4c4b0%22 width=%22400%22 height=%22500%22/%3E%3C/svg%3E')] bg-cover" />
                <div className="absolute bottom-8 left-8 right-8 grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-28 rounded-xl bg-white/70 shadow-sm" />
                  ))}
                </div>
              </div>
              <p className="pointer-events-none absolute left-6 top-5 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
                Mode Atelier · design canvas
              </p>
              <p className="pointer-events-none absolute left-6 top-10 text-xs font-semibold text-stone-600">
                Native products stay untouched · only ShopBonus widgets are editable
                {pairStatus === "paired" ? " · paired with live site" : " · pair for real domain"}
              </p>
              <BannerWidgetPreview
                config={config}
                selected={selected}
                device={device}
                simulatedCart={
                  config.template === "cart_progress"
                    ? { cart_minor: 9400, threshold_minor: 10000 }
                    : null
                }
                onSelect={() => setSelected(true)}
                onMove={(ox, oy) =>
                  pushHistory({
                    ...config,
                    placement: { ...config.placement, offset_x: ox, offset_y: oy },
                  })
                }
              />
            </div>
            <iframe ref={iframeRef} title="pair-bridge" className="hidden" />
          </div>
        </main>

        <div className={`${panelOpen ? "flex" : "hidden md:flex"} h-full shrink-0`}>
          <StudioPanel
            tab={tab}
            onTab={setTab}
            config={config}
            onChange={pushHistory}
            simulation={simulation}
            onSimulate={() => void onSimulate()}
            aiRuns={aiRuns}
            aiBusy={aiBusy}
            onAiCreate={() => void onAiCreate()}
            onAiOptimize={() => void onAiOptimize()}
            onReviewSuggestion={(id, p) => void onReviewSuggestion(id, p)}
            notice={notice}
            onClose={() => setPanelOpen(false)}
          />
        </div>
        {!panelOpen ? (
          <button
            type="button"
            className="absolute right-3 top-3 z-30 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-navy shadow"
            onClick={() => setPanelOpen(true)}
          >
            Studio
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StorefrontChrome({ shopName }: { shopName: string }) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-5">
      <p className="text-sm font-black tracking-[0.18em] text-stone-800">{shopName.toUpperCase() || "MODE ATELIER"}</p>
      <div className="flex gap-4 text-[11px] font-bold uppercase tracking-wide text-stone-500">
        <span>New</span>
        <span>Women</span>
        <span>Cart</span>
      </div>
    </div>
  );
}

function nextHourLocal(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function findUrl(config: BannerConfig): string | null {
  const t = walk(config.triggers).find((x) => x.type === "url_match");
  return typeof t?.value === "string" ? t.value : null;
}
function findCat(config: BannerConfig): string | null {
  const t = walk(config.triggers).find((x) => x.type === "category");
  return Array.isArray(t?.value) ? String(t.value[0]) : null;
}
function findSeconds(config: BannerConfig): number | null {
  const t = walk(config.triggers).find((x) => x.type === "min_seconds");
  return typeof t?.value === "number" ? t.value : null;
}
function walk(node: BannerConfig["triggers"]): Array<{ type: string; value?: unknown }> {
  if ("all" in node && Array.isArray(node.all)) return node.all.flatMap((c) => walk(c as BannerConfig["triggers"]));
  if ("any" in node && Array.isArray(node.any)) return node.any.flatMap((c) => walk(c as BannerConfig["triggers"]));
  if ("type" in node) return [node as { type: string; value?: unknown }];
  return [];
}
