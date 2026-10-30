"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import DashboardIcon from "@/components/DashboardIcon";
import PlatformIcon, { platformIconTone } from "@/components/PlatformIcon";
import CapabilityBadge from "@/components/app-store/CapabilityBadge";
import { DashboardHeading, Panel, StatusPill } from "@/components/DashboardPrimitives";
import { useWorkspace } from "@/store/WorkspaceContext";
import { formatMinor } from "@/lib/money";
import { subscribeOrderSheet } from "@/lib/echo";
import {
  ApiError,
  SERVICE_APPS,
  canAccessAppStore,
  canManageIntegrations,
  capabilityBadgeFromState,
  connectionBadge,
  connectionLifecycle,
  connectionStatusLabel,
  createConnection,
  disconnectConnection,
  fetchConnection,
  fetchConnectionCoupons,
  fetchConnectionEvents,
  fetchConnectionHealth,
  fetchConnectionProducts,
  fetchConnections,
  fetchOrders,
  fetchPlatforms,
  isVerifiedPayment,
  paymentStatusLabel,
  replaceConnectionCredentials,
  retryConnectionEvent,
  startShopifyOAuth,
  summarizeCapabilities,
  syncConnectionCoupons,
  syncConnectionProducts,
  verifyConnection,
  type CatalogCouponRow,
  type CatalogProductRow,
  type ConnectionChecklist,
  type ConnectionHealth,
  type OrderSheetRow,
  type PlatformCatalogueItem,
  type WebhookEventRow,
  type WebshopConnection,
} from "@/lib/integrations";

type MainTab = "discover" | "connections" | "services";
type PlatformFilter = "all" | "webshop" | "coming_soon" | "status";

function stepIndex(checklist: ConnectionChecklist | null, connection: WebshopConnection | null): number {
  if (!connection) return 1;
  if (!connection.setup?.webhook_url) return 1;
  if (!checklist?.checks?.order_received) return 2;
  return 3;
}

function normalizeShopifyDomain(raw: string): string {
  const trimmed = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (trimmed.endsWith(".myshopify.com")) return trimmed;
  if (/^[a-z0-9][a-z0-9-]*$/.test(trimmed)) return `${trimmed}.myshopify.com`;
  return trimmed;
}

export default function AppStorePage() {
  const { workspaceId, revision, current } = useWorkspace();
  const allowed = canAccessAppStore(current);
  const canManage = canManageIntegrations(current);

  const [mainTab, setMainTab] = useState<MainTab>("discover");
  const [platforms, setPlatforms] = useState<PlatformCatalogueItem[]>([]);
  const [connections, setConnections] = useState<WebshopConnection[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [connection, setConnection] = useState<WebshopConnection | null>(null);
  const [checklist, setChecklist] = useState<ConnectionChecklist | null>(null);
  const [health, setHealth] = useState<ConnectionHealth | null>(null);
  const [events, setEvents] = useState<WebhookEventRow[]>([]);
  const [products, setProducts] = useState<CatalogProductRow[]>([]);
  const [coupons, setCoupons] = useState<CatalogCouponRow[]>([]);
  const [orders, setOrders] = useState<OrderSheetRow[]>([]);
  const [filter, setFilter] = useState<PlatformFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [capabilityFilter, setCapabilityFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<Record<string, string> | null>(null);
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [copied, setCopied] = useState(false);
  const [live, setLive] = useState(false);

  const activeConnection = useMemo(
    () => connections.find((c) => c.platform === selectedPlatform && c.status !== "disconnected") ?? null,
    [connections, selectedPlatform]
  );

  const myConnections = useMemo(
    () => connections.filter((c) => c.status !== "disconnected"),
    [connections]
  );

  const filteredPlatforms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return platforms.filter((p) => {
      if (filter === "webshop" && p.category !== "webshop") return false;
      if (filter === "coming_soon" && p.category !== "coming_soon") return false;
      if (filter === "status") {
        const conn = connections.find((c) => c.platform === p.platform && c.status !== "disconnected");
        if (statusFilter === "connected" && conn?.status !== "connected") return false;
        if (statusFilter === "setup" && !(conn && conn.status !== "connected" && conn.status !== "disconnected"))
          return false;
        if (statusFilter === "disconnected" && conn) return false;
        if (statusFilter === "error" && conn?.status !== "error") return false;
      }
      if (capabilityFilter !== "all") {
        const cap = p.capabilities?.[capabilityFilter];
        if (!cap || cap.state === "UNSUPPORTED") return false;
      }
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.platform.includes(q);
    });
  }, [platforms, filter, query, connections, statusFilter, capabilityFilter]);

  const selectedMeta = platforms.find((p) => p.platform === selectedPlatform) ?? null;
  const lifecycle = connectionLifecycle(connection ?? activeConnection, checklist);
  const step = stepIndex(checklist, connection ?? activeConnection);
  const badge = connectionBadge(selectedMeta, connection ?? activeConnection, checklist);
  const caps = health?.capabilities ?? selectedMeta?.capabilities;

  const loadBase = useCallback(
    async (signal?: AbortSignal) => {
      if (!allowed) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [plats, conns, orderPage] = await Promise.all([
          fetchPlatforms(signal),
          fetchConnections(workspaceId, signal),
          fetchOrders(workspaceId, { per_page: 10, sort: "-placed_at" }, signal),
        ]);
        if (signal?.aborted) return;
        setPlatforms(plats);
        setConnections(conns);
        setOrders(orderPage.data ?? []);
        setSelectedPlatform((currentPlat) => {
          if (currentPlat) return currentPlat;
          return (
            conns.find((c) => c.status !== "disconnected")?.platform ??
            plats.find((p) => p.available)?.platform ??
            plats[0]?.platform ??
            null
          );
        });
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof ApiError ? err.message : "App Store kon niet worden geladen.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [workspaceId, allowed]
  );

  const refreshSelected = useCallback(
    async (signal?: AbortSignal) => {
      const currentConn =
        connections.find((c) => c.platform === selectedPlatform && c.status !== "disconnected") ?? null;
      if (!currentConn || !selectedPlatform) {
        setConnection(null);
        setChecklist(null);
        setHealth(null);
        setEvents([]);
        setProducts([]);
        setCoupons([]);
        return;
      }
      try {
        const [detail, check, healthData, eventRows] = await Promise.all([
          fetchConnection(workspaceId, currentConn.id, signal),
          verifyConnection(workspaceId, currentConn.id, signal),
          fetchConnectionHealth(workspaceId, currentConn.id, signal).catch(() => null),
          fetchConnectionEvents(workspaceId, currentConn.id, signal).catch(() => []),
        ]);
        if (signal?.aborted) return;
        setConnection(detail);
        setChecklist(check);
        setHealth(healthData);
        setEvents(eventRows);
        const [prodRows, couponRows] = await Promise.all([
          fetchConnectionProducts(workspaceId, currentConn.id, signal).catch(() => []),
          fetchConnectionCoupons(workspaceId, currentConn.id, signal).catch(() => []),
        ]);
        if (signal?.aborted) return;
        setProducts(prodRows);
        setCoupons(couponRows);
      } catch (err) {
        if (signal?.aborted) return;
        if (err instanceof ApiError && err.status === 404) {
          setConnection(null);
          setChecklist(null);
          return;
        }
        setError(err instanceof ApiError ? err.message : "Verbinding kon niet worden geladen.");
      }
    },
    [workspaceId, selectedPlatform, connections]
  );

  const refreshOrders = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const page = await fetchOrders(workspaceId, { per_page: 10, sort: "-placed_at" }, signal);
        if (!signal?.aborted) setOrders(page.data ?? []);
      } catch {
        /* keep previous rows */
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    const ac = new AbortController();
    void loadBase(ac.signal);
    return () => ac.abort();
  }, [loadBase, revision]);

  useEffect(() => {
    const ac = new AbortController();
    void refreshSelected(ac.signal);
    return () => ac.abort();
  }, [refreshSelected]);

  useEffect(() => {
    if (!current?.id || !allowed) return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    void subscribeOrderSheet(current.id, () => {
      if (!disposed) void refreshOrders();
    }).then((fn) => {
      if (disposed) fn();
      else {
        unsubscribe = fn;
        setLive(true);
      }
    });
    const poll = window.setInterval(() => void refreshOrders(), 20000);
    return () => {
      disposed = true;
      unsubscribe?.();
      window.clearInterval(poll);
      setLive(false);
    };
  }, [current?.id, refreshOrders, allowed]);

  const selectPlatform = (platform: string) => {
    setSelectedPlatform(platform);
    setSecrets(null);
    setMainTab("discover");
  };

  const onConnect = async () => {
    if (!selectedPlatform || !selectedMeta?.available || !canManage) return;
    setBusy(true);
    setError(null);
    setSecrets(null);
    try {
      const body: Record<string, unknown> = {};
      if (selectedPlatform === "woocommerce") {
        if (storeUrl) body.store_url = storeUrl;
        if (consumerKey) body.consumer_key = consumerKey;
        if (consumerSecret) body.consumer_secret = consumerSecret;
      }
      if (selectedPlatform === "shopify" && shopifyDomain) {
        body.shop_domain = normalizeShopifyDomain(shopifyDomain);
      }
      const created = await createConnection(workspaceId, selectedPlatform, body);
      setSecrets(created.secrets ?? null);
      setConnection(created);
      setConnections((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      const check = await verifyConnection(workspaceId, created.id);
      setChecklist(check);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verbinding starten mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const onShopifyOAuth = async () => {
    if (!canManage) return;
    const domain = normalizeShopifyDomain(shopifyDomain);
    if (!domain.endsWith(".myshopify.com")) {
      setError("Enter a canonical shop domain like your-store.myshopify.com");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const started = await startShopifyOAuth(workspaceId, domain);
      window.location.assign(started.authorization_url);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Shopify OAuth could not start. Check SHOPIFY_OAUTH_ENABLED and app credentials."
      );
      setBusy(false);
    }
  };

  const onSaveCredentials = async () => {
    const conn = connection ?? activeConnection;
    if (!conn || !canManage) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (storeUrl) body.store_url = storeUrl;
      if (consumerKey) body.consumer_key = consumerKey;
      if (consumerSecret) body.consumer_secret = consumerSecret;
      const updated = await replaceConnectionCredentials(workspaceId, conn.id, body);
      setSecrets(updated.secrets ?? null);
      setConnection(updated);
      const check = await verifyConnection(workspaceId, updated.id);
      setChecklist(check);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Credentials opslaan mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    const conn = connection ?? activeConnection;
    if (!conn) return;
    setBusy(true);
    setError(null);
    try {
      const check = await verifyConnection(workspaceId, conn.id);
      setChecklist(check);
      const detail = await fetchConnection(workspaceId, conn.id);
      setConnection(detail);
      const healthData = await fetchConnectionHealth(workspaceId, conn.id).catch(() => null);
      setHealth(healthData);
      await refreshOrders();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verificatie mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const onReconnect = async () => {
    const conn = connection ?? activeConnection;
    if (!conn || !canManage) return;
    setError(null);
    if (selectedPlatform === "shopify" && shopifyDomain.trim()) {
      await onShopifyOAuth();
      return;
    }
    if (selectedPlatform === "woocommerce" && (storeUrl || consumerKey)) {
      await onSaveCredentials();
      return;
    }
    await onVerify();
  };

  const onDisconnect = async () => {
    const conn = connection ?? activeConnection;
    if (!conn || !canManage) return;
    if (
      !window.confirm(
        "Disconnect this shop? Tokens/webhooks are revoked where supported. Historical orders, ledger and audit stay. Other shops are unaffected."
      )
    )
      return;
    setBusy(true);
    try {
      await disconnectConnection(workspaceId, conn.id);
      setConnection(null);
      setChecklist(null);
      setHealth(null);
      setEvents([]);
      setProducts([]);
      setCoupons([]);
      setSecrets(null);
      setConnections((prev) => prev.map((c) => (c.id === conn.id ? { ...c, status: "disconnected" } : c)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verbreken mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const onSyncCatalog = async (kind: "products" | "coupons") => {
    const conn = connection ?? activeConnection;
    if (!conn || !canManage) return;
    setBusy(true);
    setError(null);
    try {
      if (kind === "products") {
        const result = await syncConnectionProducts(workspaceId, conn.id);
        setProducts(await fetchConnectionProducts(workspaceId, conn.id));
        if (result.imported === 0 && !result.exhausted) {
          setError("Product sync returned no rows — capability may be UNSUPPORTED for this platform.");
        }
      } else {
        const result = await syncConnectionCoupons(workspaceId, conn.id);
        setCoupons(await fetchConnectionCoupons(workspaceId, conn.id));
        if (result.imported === 0 && !result.exhausted) {
          setError("Coupon sync returned no rows — capability may be UNSUPPORTED for this platform.");
        }
      }
      setHealth(await fetchConnectionHealth(workspaceId, conn.id).catch(() => null));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Catalog sync failed (often UNSUPPORTED).");
    } finally {
      setBusy(false);
    }
  };

  const onRetryEvent = async (eventId: string) => {
    const conn = connection ?? activeConnection;
    if (!conn || !canManage) return;
    setBusy(true);
    try {
      await retryConnectionEvent(workspaceId, conn.id, eventId);
      setEvents(await fetchConnectionEvents(workspaceId, conn.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Event retry failed.");
    } finally {
      setBusy(false);
    }
  };

  const webhookUrl = connection?.setup?.webhook_url ?? activeConnection?.setup?.webhook_url;
  const steps = connection?.setup?.steps ?? [
    "Select your platform and start the connection for this shop.",
    "Grant least-privilege access or paste the ShopBonus webhook URL.",
    "Verify a real paid order independently — a token handshake is not verification.",
  ];

  const copyUrl = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!allowed) {
    return (
      <DashboardShell>
        <DashboardHeading
          title="App Store"
          subtitle="Webshop platforms and service connections for this shop."
        />
        <Panel>
          <p className="text-sm font-semibold text-navy">
            You do not have App Store access on this workspace. Owners and managers can connect
            platforms; employees and sales agents cannot.
          </p>
          <p className="mt-2 text-sm text-muted">
            Current role: <span className="font-bold text-navy">{current?.role ?? "unknown"}</span>
          </p>
        </Panel>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <DashboardHeading
        title="App Store"
        subtitle={`Webshop Platforms · shop ${current?.name ?? "—"} · connections stay scoped to this workspace.`}
      />

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["discover", "Discover Apps"],
            ["connections", "My Connections"],
            ["services", "Services"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMainTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
              mainTab === id ? "bg-navy text-white" : "bg-white text-navy/80 ring-1 ring-blue-100 hover:bg-blue-50"
            }`}
          >
            {label}
            {id === "connections" ? ` (${myConnections.length})` : ""}
          </button>
        ))}
      </div>

      {mainTab === "services" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SERVICE_APPS.map((svc) => (
            <Panel key={svc.id} className="!p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-extrabold text-navy">{svc.name}</h3>
                <CapabilityBadge
                  kind={
                    svc.status === "AVAILABLE"
                      ? "VERIFIED"
                      : svc.status === "NOT_IMPLEMENTED"
                        ? "UNSUPPORTED"
                        : svc.status === "ADMIN_ONLY"
                          ? "BLOCKED"
                          : "SETUP REQUIRED"
                  }
                />
              </div>
              <p className="mt-1 text-sm font-semibold text-muted">{svc.purpose}</p>
              <p className="mt-3 text-xs font-semibold leading-relaxed text-navy/80">{svc.note}</p>
              {svc.href && svc.status === "AVAILABLE" && (
                <Link href={svc.href} className="mt-3 inline-flex text-sm font-extrabold text-brand hover:underline">
                  Open settings
                </Link>
              )}
              {svc.status === "ADMIN_ONLY" && (
                <p className="mt-3 text-xs font-bold text-amber-800">Super Admin configures this service.</p>
              )}
            </Panel>
          ))}
        </div>
      )}

      {mainTab === "connections" && (
        <Panel className="!p-4 sm:!p-5">
          {myConnections.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-muted">
              No active connections. Open Discover Apps to connect a platform.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myConnections.map((c) => {
                const meta = platforms.find((p) => p.platform === c.platform);
                const b = connectionBadge(meta, c);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectPlatform(c.platform)}
                    className="rounded-2xl border border-blue-100 bg-white p-4 text-left hover:border-brand/40"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`grid h-11 w-11 place-items-center rounded-xl p-2.5 ${platformIconTone(c.platform)}`}>
                        <PlatformIcon platform={c.platform} className="h-6 w-6" title={meta?.name ?? c.platform} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-extrabold text-navy">{meta?.name ?? c.platform}</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-muted">
                          {c.external_shop_ref ?? connectionStatusLabel(c.status)}
                        </p>
                        <div className="mt-2">
                          <CapabilityBadge kind={b.kind} title={b.detail} />
                        </div>
                      </div>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand">
                      Manage
                      <DashboardIcon name="arrow" size={14} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {mainTab === "discover" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <Panel className="!p-4 sm:!p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(
                [
                  ["all", "All"],
                  ["webshop", "Webshop Platforms"],
                  ["coming_soon", "Coming soon"],
                  ["status", "By status"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                    filter === id ? "bg-brand text-white" : "bg-blue-50 text-navy/80 hover:bg-blue-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {filter === "status" && (
              <div className="mb-3 flex flex-wrap gap-2">
                {(["all", "connected", "setup", "disconnected", "error"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      statusFilter === s ? "bg-navy text-white" : "bg-slate-100 text-navy"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-3 flex flex-wrap gap-2">
              <span className="self-center text-xs font-extrabold uppercase tracking-wide text-muted">Capability</span>
              {(["all", "orders", "products", "coupons_read", "banner_embed", "refunds"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCapabilityFilter(c)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    capabilityFilter === c ? "bg-navy text-white" : "bg-slate-100 text-navy"
                  }`}
                >
                  {c === "all" ? "all" : c.replaceAll("_", " ")}
                </button>
              ))}
            </div>

            <label className="relative mb-4 block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <DashboardIcon name="search" size={18} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search platforms…"
                className="w-full rounded-2xl border border-blue-100 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-navy outline-none ring-brand/30 placeholder:text-muted focus:ring-2"
              />
            </label>

            {loading ? (
              <p className="py-10 text-center text-sm font-semibold text-muted">Platforms laden…</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPlatforms.map((p) => {
                  const conn = connections.find((c) => c.platform === p.platform && c.status !== "disconnected");
                  const selected = selectedPlatform === p.platform;
                  const b = connectionBadge(p, conn);
                  return (
                    <button
                      key={p.platform}
                      type="button"
                      onClick={() => selectPlatform(p.platform)}
                      className={`rounded-2xl border bg-white p-4 text-left transition ${
                        selected
                          ? "border-brand shadow-[0_10px_28px_-16px_rgba(11,116,255,0.45)]"
                          : "border-blue-100/80 hover:border-brand/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`grid h-11 w-11 place-items-center rounded-xl p-2.5 ${platformIconTone(p.platform)}`}>
                          <PlatformIcon platform={p.platform} className="h-6 w-6" title={p.name} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-extrabold text-navy">{p.name}</p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-snug text-muted">
                            {summarizeCapabilities(p.capabilities)}
                          </p>
                          <div className="mt-2">
                            <CapabilityBadge kind={b.kind} title={b.detail} />
                          </div>
                        </div>
                      </div>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand">
                        {!p.available
                          ? "Coming soon"
                          : conn
                            ? "Manage"
                            : "Connect"}
                        <DashboardIcon name="arrow" size={14} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          <div className="flex flex-col gap-6">
            <Panel>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-navy">{selectedMeta?.name ?? "Platform"}</h2>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    {activeConnection ? "Manage connection" : "Connect"} · step {step} of 3 ·{" "}
                    {connectionStatusLabel(lifecycle)}
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-navy/70">{badge.detail}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <CapabilityBadge kind={badge.kind} title={badge.detail} />
                  <StatusPill
                    status={
                      lifecycle === "connected"
                        ? "Geverifieerd"
                        : lifecycle === "error"
                          ? "Fout"
                          : "In behandeling"
                    }
                  />
                </div>
              </div>

              {caps && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {Object.entries(caps).map(([key, cap]) => {
                    const chip = capabilityBadgeFromState(key, cap);
                    return (
                      <CapabilityBadge
                        key={key}
                        kind={chip.kind}
                        label={chip.label}
                        title={chip.detail}
                      />
                    );
                  })}
                </div>
              )}

              {!selectedMeta?.available && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  {selectedMeta?.blocked_reason ?? "This platform cannot be connected yet."}
                </p>
              )}

              {selectedMeta?.available && (
                <>
                  <ol className="space-y-3">
                    {steps.map((text, i) => (
                      <li key={i} className="flex gap-3 text-sm text-navy/90">
                        <span
                          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${
                            i + 1 <= step ? "bg-brand text-white" : "bg-blue-50 text-brand"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="font-semibold leading-snug">{String(text)}</span>
                      </li>
                    ))}
                  </ol>

                  {webhookUrl && (
                    <div className="mt-5">
                      <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-muted">
                        Webhook endpoint URL
                      </p>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={webhookUrl}
                          className="min-w-0 flex-1 truncate rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-navy"
                        />
                        <button
                          type="button"
                          onClick={() => void copyUrl()}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-sm font-bold text-white"
                        >
                          <DashboardIcon name="copy" size={16} />
                          {copied ? "Copied" : "Copy URL"}
                        </button>
                      </div>
                    </div>
                  )}

                  {secrets && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
                      <p className="font-extrabold text-amber-900">Show once — store now</p>
                      {Object.entries(secrets).map(([key, value]) => (
                        <p key={key} className="mt-1 break-all font-mono text-amber-950">
                          <span className="font-bold">{key}:</span> {value}
                        </p>
                      ))}
                    </div>
                  )}

                  {selectedPlatform === "shopify" && (
                    <div className="mt-4 grid gap-2">
                      <input
                        value={shopifyDomain}
                        onChange={(e) => setShopifyDomain(e.target.value)}
                        placeholder="your-store.myshopify.com"
                        className="rounded-xl border border-blue-100 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                      />
                      <p className="text-xs font-semibold text-muted">
                        Least privilege: read_orders, read_products. OAuth requires SHOPIFY_OAUTH_ENABLED on the
                        server.
                      </p>
                    </div>
                  )}

                  {selectedPlatform === "woocommerce" && (
                    <div className="mt-4 grid gap-2">
                      <input
                        value={storeUrl}
                        onChange={(e) => setStoreUrl(e.target.value)}
                        placeholder="https://your-store.example"
                        className="rounded-xl border border-blue-100 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                      />
                      <input
                        value={consumerKey}
                        onChange={(e) => setConsumerKey(e.target.value)}
                        placeholder="Read-only consumer key (optional)"
                        className="rounded-xl border border-blue-100 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                      />
                      <input
                        value={consumerSecret}
                        onChange={(e) => setConsumerSecret(e.target.value)}
                        placeholder="Read-only consumer secret (optional)"
                        type="password"
                        autoComplete="off"
                        className="rounded-xl border border-blue-100 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                      />
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {!activeConnection && canManage && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onConnect()}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
                      >
                        <DashboardIcon name="plus" size={16} />
                        Connect
                      </button>
                    )}
                    {selectedPlatform === "shopify" && canManage && (
                      <button
                        type="button"
                        disabled={busy || !shopifyDomain.trim()}
                        onClick={() => void onShopifyOAuth()}
                        className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
                      >
                        Shopify OAuth
                      </button>
                    )}
                    {activeConnection && selectedPlatform === "woocommerce" && canManage && (storeUrl || consumerKey) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onSaveCredentials()}
                        className="rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-navy"
                      >
                        Save API credentials
                      </button>
                    )}
                    {activeConnection && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onVerify()}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
                      >
                        <DashboardIcon name="sync" size={16} />
                        Verify
                      </button>
                    )}
                    {activeConnection && canManage && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onReconnect()}
                        className="rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-navy"
                      >
                        Reconnect
                      </button>
                    )}
                    {activeConnection && canManage && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onDisconnect()}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>

                  {checklist && (
                    <div className="mt-4 grid gap-1.5 text-xs font-semibold text-muted">
                      {Object.entries(checklist.checks).map(([key, ok]) => (
                        <p key={key} className={ok ? "text-green-700" : "text-amber-700"}>
                          {ok ? "✓" : "○"} {key.replaceAll("_", " ")}
                        </p>
                      ))}
                      {checklist.missing_gates.length > 0 && (
                        <p className="mt-1 text-amber-800">
                          Remaining gates: {checklist.missing_gates.join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  {health && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-slate-50 px-3 py-3 text-xs font-semibold text-navy/80">
                      <p className="font-extrabold text-navy">Sync / event health</p>
                      <p className="mt-1">
                        Sync healthy: {health.sync.healthy ? "yes" : "no"}
                        {health.sync.error ? ` · ${health.sync.error}` : ""}
                      </p>
                      <p>
                        Last success: {health.sync.last_success_at ?? "—"} · products {health.products_synced} ·
                        coupons {health.coupons_synced}
                      </p>
                      <p>Last event: {connection?.last_event_at ?? "—"}</p>
                    </div>
                  )}
                </>
              )}
            </Panel>

            {activeConnection && (
              <Panel>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-black text-navy">Catalog & events</h2>
                  <div className="flex flex-wrap gap-2">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onSyncCatalog("products")}
                          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-navy"
                        >
                          Sync products
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onSyncCatalog("coupons")}
                          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-navy"
                        >
                          Sync coupons
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="mb-3 text-xs font-semibold text-muted">
                  Native coupons ≠ ShopBonus wallet vouchers. Sync only succeeds where CatalogCapable is
                  implemented (today: WooCommerce). Others return UNSUPPORTED — never shown as green.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-extrabold uppercase text-muted">Products ({products.length})</p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs font-semibold text-navy/80">
                      {products.length === 0 ? (
                        <li className="text-muted">No synced products.</li>
                      ) : (
                        products.slice(0, 20).map((p) => (
                          <li key={p.id}>
                            {p.name ?? p.external_product_id}
                            {p.sku ? ` · ${p.sku}` : ""}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-extrabold uppercase text-muted">Coupons ({coupons.length})</p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs font-semibold text-navy/80">
                      {coupons.length === 0 ? (
                        <li className="text-muted">No synced coupons.</li>
                      ) : (
                        coupons.slice(0, 20).map((c) => (
                          <li key={c.id}>
                            {c.code ?? c.external_coupon_id}
                            {!c.eligible_public ? " · private" : ""}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="mb-1 text-xs font-extrabold uppercase text-muted">Recent events</p>
                  <ul className="max-h-36 space-y-1 overflow-y-auto text-xs font-semibold">
                    {events.length === 0 ? (
                      <li className="text-muted">No webhook events yet.</li>
                    ) : (
                      events.slice(0, 15).map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-2 text-navy/80">
                          <span>
                            {e.topic} · {e.status}
                            {e.error_code ? ` · ${e.error_code}` : ""}
                          </span>
                          {e.status === "failed" && canManage && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onRetryEvent(e.id)}
                              className="font-bold text-brand"
                            >
                              Retry
                            </button>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </Panel>
            )}

            <Panel>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-navy">Live Order Sheet</h2>
                  <p className="text-sm font-semibold text-muted">
                    Shop-scoped realtime sheet for {current?.name ?? "this workspace"} only.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-extrabold text-green-700">
                  <span className={`h-2 w-2 rounded-full ${live ? "bg-green-500" : "bg-amber-400"}`} />
                  {live ? "Receiving orders" : "Polling"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-blue-50 text-xs font-extrabold uppercase tracking-wide text-muted">
                      <th className="px-2 py-2">Order</th>
                      <th className="px-2 py-2">Platform</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-2 py-8 text-center font-semibold text-muted">
                          No orders yet. Place a paid test order after webhook setup.
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => (
                        <tr key={o.id} className="border-b border-blue-50/80">
                          <td className="px-2 py-2.5 font-bold text-navy">
                            #{o.reference || o.external_order_id}
                          </td>
                          <td className="px-2 py-2.5 font-semibold text-navy/90">{o.platform}</td>
                          <td className="px-2 py-2.5 font-semibold">
                            {o.amount_minor == null
                              ? "—"
                              : formatMinor(o.amount_minor, o.currency || "EUR")}
                          </td>
                          <td className="px-2 py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                                isVerifiedPayment(o.payment_status)
                                  ? "bg-green-50 text-green-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {paymentStatusLabel(o.payment_status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs font-semibold text-muted">
                Paid status is independent of cashback/Answer24 eligibility. Unpaid/canceled never start rewards.
              </p>
            </Panel>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
