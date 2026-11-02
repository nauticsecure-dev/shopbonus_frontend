"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [storefrontUrl, setStorefrontUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("Customers see the published version until you launch.");
  const [simulation, setSimulation] = useState<BannerSimulation | null>(null);
  const [aiRuns, setAiRuns] = useState<BannerAiRun[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [createdDraft, setCreatedDraft] = useState<string | null>(null);
  const [history, setHistory] = useState<BannerConfig[]>([]);
  const [future, setFuture] = useState<BannerConfig[]>([]);
  const [pairStatus, setPairStatus] = useState<string>("canvas");
  const [panelOpen, setPanelOpen] = useState(true);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const connectionRef = useRef<{ target: Window; origin: string; key: string; nonce: string; paired: boolean } | null>(null);
  const pairingCleanup = useRef<() => void>(() => {});
  const pairGeneration = useRef(0);
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  useEffect(() => () => { pairGeneration.current++; pairingCleanup.current(); }, []);

  useEffect(() => {
    const ac = new AbortController();
    void fetchBannerInstallation(workspaceId).then((installation) => {
      if (!ac.signal.aborted) setStorefrontUrl(installation.allowed_origins[0] || null);
    }).catch(() => { if (!ac.signal.aborted) setError("Could not load storefront installation."); });
    return () => ac.abort();
  }, [workspaceId]);

  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection?.paired) return;
    connection.target.postMessage({ schema: EMBED_MSG_SCHEMA, type: "editor.apply_config", key: connection.key,
      nonce: connection.nonce, campaign: bannerId, config }, connection.origin);
  }, [config, bannerId, pairStatus]);
  useEffect(() => {
    const finishGesture = () => {
      const connection = connectionRef.current;
      if (connection?.paired) connection.target.postMessage({ schema: EMBED_MSG_SCHEMA, type: "editor.pointer_end",
        key: connection.key, nonce: connection.nonce, campaign: bannerId }, connection.origin);
    };
    window.addEventListener("pointerup", finishGesture);
    window.addEventListener("blur", finishGesture);
    return () => { window.removeEventListener("pointerup", finishGesture); window.removeEventListener("blur", finishGesture); };
  }, [bannerId]);

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
    void Promise.resolve().then(() => load(ac.signal)).catch((err) => {
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
    setError(null);
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
      const unchanged = configRef.current === config;
      setDirty(!unchanged);
      if (!unchanged) setError("New edits arrived while saving. Save again before publishing.");
      return unchanged;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onPublish = async () => {
    if (dirty && !(await onSave())) return;
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
    if (dirty && !(await onSave())) return;
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
        setCreatedDraft(result.draft_campaign || null);
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

  const pairWebsite = async (target: Window, origin: string) => {
    pairingCleanup.current();
    const generation = ++pairGeneration.current;
    setPairStatus("pairing");
    try {
      const installation = await fetchBannerInstallation(workspaceId);
      if (!installation.allowed_origins.includes(origin)) throw new Error("Storefront origin is not allowed.");
      const pairing = await requestBannerPairing(workspaceId, origin);
      if (generation !== pairGeneration.current) return;
      const connection = { target, origin, key: installation.public_key, nonce: crypto.randomUUID(), paired: false };
      connectionRef.current = connection;
      let sentPair = false;
      const send = (type: string, extra = {}) => target.postMessage({ schema: EMBED_MSG_SCHEMA, type,
        key: connection.key, nonce: connection.nonce, ...extra }, origin);
      const onMsg = (ev: MessageEvent) => {
        const data = ev.data;
        if (ev.origin !== origin || ev.source !== target || !data || data.schema !== EMBED_MSG_SCHEMA ||
            data.key !== connection.key || data.nonce !== connection.nonce) return;
        if (data.type === "editor.ready" && !sentPair) {
          sentPair = true;
          send("editor.pair", { pairing_token: pairing.pairing_token, campaign: bannerId });
        }
        if (data.type === "editor.paired") {
          connection.paired = true;
          setPairStatus("paired");
          clearInterval(retry);
          clearTimeout(timeout);
        }
        if (data.type === "editor.pair_failed" || data.type === "editor.expired" || data.type === "editor.draft_failed") {
          connection.paired = false;
          setPairStatus("failed");
          setError("Storefront pairing failed or expired. Reconnect to continue.");
        }
        if (!connection.paired) return;
        if (data.type === "banner.resized" && data.campaign === bannerId && Number.isInteger(data.width) &&
            Number.isInteger(data.height) && data.width >= 160 && data.width <= 720 && data.height >= 80 && data.height <= 800) {
          const current = configRef.current;
          setHistory((h) => [...h.slice(-29), current]); setFuture([]);
          setConfig({ ...current, placement: { ...current.placement, width: data.width, height: data.height } }); setDirty(true);
        }
        if (data.type === "banner.target_missing") setError("The placement target is missing. Select a new target or corner anchor.");
        if (data.type === "banner.moved" && data.campaign === bannerId &&
            Number.isInteger(data.offset_x) && Number.isInteger(data.offset_y) &&
            Math.abs(data.offset_x) <= 500 && Math.abs(data.offset_y) <= 500) {
          const current = configRef.current;
          setHistory((h) => [...h.slice(-29), current]);
          setFuture([]);
          setConfig({ ...current, placement: { ...current.placement,
            ...(data.anchor && ["top_left", "top_right", "bottom_left", "bottom_right"].includes(data.anchor) ? { anchor: data.anchor } : {}),
            offset_x: data.offset_x, offset_y: data.offset_y } });
          setDirty(true);
        }
      };
      window.addEventListener("message", onMsg);
      const retry = setInterval(() => { if (!sentPair) send("editor.handshake"); }, 700);
      const timeout = setTimeout(() => {
        clearInterval(retry);
        if (!connection.paired) { setPairStatus("failed"); setError("The site did not pair. Check its embed installation or open it in a separate window."); }
      }, 20000);
      pairingCleanup.current = () => {
        clearInterval(retry); clearTimeout(timeout); window.removeEventListener("message", onMsg);
        if (connection.paired) send("editor.disconnect");
        connection.paired = false;
        if (connectionRef.current === connection) connectionRef.current = null;
      };
      send("editor.handshake");
    } catch (err) {
      setPairStatus("failed");
      setError(err instanceof Error ? err.message : "Could not pair storefront.");
    }
  };

  const openOnWebsite = () => {
    if (!storefrontUrl) { setError("Add an allowed origin in Installation first."); return; }
    const win = window.open(storefrontUrl, "shopbonus-live-editor");
    if (!win) { setError("Popup blocked. Allow popups for ShopBonus and reconnect."); return; }
    void pairWebsite(win, new URL(storefrontUrl).origin);
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

        {createdDraft ? <Link className="absolute bottom-4 left-20 z-40 rounded-xl bg-white p-3 text-sm underline shadow" href={`/dashboard/banners/${createdDraft}/studio`}>Open editable AI test draft</Link> : null}
        <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-slate-200 p-3 md:p-6">
          <div
            data-testid="storefront-canvas"
            className={`relative overflow-hidden rounded-2xl bg-white shadow-2xl transition-all ${
              device === "mobile" ? "h-[720px] w-[390px]" : "h-full w-full max-w-6xl"
            }`}
          >
            {storefrontUrl ? (
              <iframe ref={iframeRef} src={storefrontUrl} title={shopName + " live storefront"}
                className="h-full w-full border-0" onLoad={() => {
                  if (iframeRef.current?.contentWindow) void pairWebsite(iframeRef.current.contentWindow, new URL(storefrontUrl).origin);
                }} />
            ) : <p className="p-8 text-sm">Configure an allowed storefront origin in Installation to edit your website.</p>}
            {pairStatus !== "paired" ? <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white p-4 text-sm shadow">
              Storefront: {pairStatus}. If the theme blocks framing, <button type="button" className="underline" onClick={openOnWebsite}>open your website in a window</button>.
            </div> : null}

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
