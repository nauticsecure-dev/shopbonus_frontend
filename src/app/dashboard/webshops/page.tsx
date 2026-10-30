"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import DashboardIcon from "@/components/DashboardIcon";
import PlatformIcon, { platformIconTone } from "@/components/PlatformIcon";
import { DashboardHeading, Panel, StatusPill } from "@/components/DashboardPrimitives";
import { useWorkspace } from "@/store/WorkspaceContext";
import { formatMinor } from "@/lib/money";
import { subscribeOrderSheet } from "@/lib/echo";
import {
  ApiError,
  connectionLifecycle,
  connectionStatusLabel,
  createConnection,
  disconnectConnection,
  fetchConnection,
  fetchConnections,
  fetchOrders,
  fetchPlatforms,
  isVerifiedPayment,
  paymentStatusLabel,
  replaceConnectionCredentials,
  verifyConnection,
  type ConnectionChecklist,
  type OrderSheetRow,
  type PlatformCatalogueItem,
  type WebshopConnection,
} from "@/lib/integrations";

type FilterTab = "all" | "webshop" | "marketplace";

function stepIndex(checklist: ConnectionChecklist | null, connection: WebshopConnection | null): number {
  if (!connection) return 1;
  if (!connection.setup?.webhook_url) return 1;
  if (!checklist?.checks?.order_received) return 2;
  return 3;
}

export default function WebshopsPage() {
  const { workspaceId, revision, current } = useWorkspace();
  const [platforms, setPlatforms] = useState<PlatformCatalogueItem[]>([]);
  const [connections, setConnections] = useState<WebshopConnection[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [connection, setConnection] = useState<WebshopConnection | null>(null);
  const [checklist, setChecklist] = useState<ConnectionChecklist | null>(null);
  const [orders, setOrders] = useState<OrderSheetRow[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<Record<string, string> | null>(null);
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [live, setLive] = useState(false);

  const activeConnection = useMemo(
    () => connections.find((c) => c.platform === selectedPlatform && c.status !== "disconnected") ?? null,
    [connections, selectedPlatform]
  );

  const filteredPlatforms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return platforms.filter((p) => {
      if (filter === "webshop" && p.category !== "webshop") return false;
      if (filter === "marketplace" && p.category !== "marketplace") return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.platform.includes(q);
    });
  }, [platforms, filter, query]);

  const selectedMeta = platforms.find((p) => p.platform === selectedPlatform) ?? null;
  const lifecycle = connectionLifecycle(connection ?? activeConnection, checklist);
  const step = stepIndex(checklist, connection ?? activeConnection);

  const loadBase = useCallback(
    async (signal?: AbortSignal) => {
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
        setSelectedPlatform((current) => {
          if (current) return current;
          return (
            conns.find((c) => c.status !== "disconnected")?.platform ??
            plats.find((p) => p.available)?.platform ??
            plats[0]?.platform ??
            null
          );
        });
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof ApiError ? err.message : "Webshops konden niet worden geladen.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [workspaceId]
  );

  const refreshSelected = useCallback(
    async (signal?: AbortSignal) => {
      const currentConn =
        connections.find((c) => c.platform === selectedPlatform && c.status !== "disconnected") ?? null;
      if (!currentConn || !selectedPlatform) {
        setConnection(null);
        setChecklist(null);
        return;
      }
      try {
        const [detail, check] = await Promise.all([
          fetchConnection(workspaceId, currentConn.id, signal),
          verifyConnection(workspaceId, currentConn.id, signal),
        ]);
        if (signal?.aborted) return;
        setConnection(detail);
        setChecklist(check);
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
    if (!current?.id) return;
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
  }, [current?.id, refreshOrders]);

  const onConnect = async () => {
    if (!selectedPlatform || !selectedMeta?.available) return;
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

  const onSaveCredentials = async () => {
    const conn = connection ?? activeConnection;
    if (!conn) return;
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
      await refreshOrders();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verificatie mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = async () => {
    const conn = connection ?? activeConnection;
    if (!conn) return;
    if (!window.confirm("Verbinding verbreken? Webhooks van deze shop stoppen direct.")) return;
    setBusy(true);
    try {
      await disconnectConnection(workspaceId, conn.id);
      setConnection(null);
      setChecklist(null);
      setSecrets(null);
      setConnections((prev) => prev.map((c) => (c.id === conn.id ? { ...c, status: "disconnected" } : c)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verbreken mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const webhookUrl = connection?.setup?.webhook_url ?? activeConnection?.setup?.webhook_url;
  const steps = connection?.setup?.steps ?? [
    "Selecteer je platform en start de koppeling.",
    "Plak de ShopBonus webhook-URL in je webshop.",
    "Plaats een echte betaalde testorder om te verifiëren.",
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

  return (
    <DashboardShell>
      <DashboardHeading
        title="Connect your webshop"
        subtitle="Select your platform and start receiving orders."
      />

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Panel className="!p-4 sm:!p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(
              [
                ["all", "All"],
                ["webshop", "Webshops"],
                ["marketplace", "Marketplaces · Coming soon"],
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

          <label className="relative mb-4 block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <DashboardIcon name="search" size={18} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find your webshop platform..."
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
                const life = connectionLifecycle(conn);
                return (
                  <button
                    key={p.platform}
                    type="button"
                    onClick={() => setSelectedPlatform(p.platform)}
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
                        <p className="mt-0.5 text-xs font-semibold text-muted">
                          {!p.available
                            ? "Coming soon"
                            : conn
                              ? connectionStatusLabel(life)
                              : "Connect " + p.name}
                        </p>
                      </div>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand">
                      {p.available ? (conn ? "Open setup" : `Connect ${p.name}`) : "Unavailable"}
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
                <h2 className="text-xl font-black text-navy">
                  {selectedMeta?.name ?? "Platform"} setup
                </h2>
                <p className="mt-1 text-sm font-semibold text-muted">
                  Step {step} of 3 · {connectionStatusLabel(lifecycle)}
                </p>
              </div>
              <StatusPill
                status={
                  lifecycle === "connected"
                    ? "Geverifieerd"
                    : lifecycle === "limited" || lifecycle === "error"
                      ? "In behandeling"
                      : "In behandeling"
                }
              />
            </div>

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
                      <span className="font-semibold leading-snug">{text}</span>
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
                      className="rounded-xl border border-blue-100 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  {!activeConnection && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onConnect()}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
                    >
                      <DashboardIcon name="plus" size={16} />
                      Start connection
                    </button>
                  )}
                  {activeConnection && selectedPlatform === "woocommerce" && (storeUrl || consumerKey) && (
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
                      Verify connection
                    </button>
                  )}
                  {activeConnection && (
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
              </>
            )}
          </Panel>

          <Panel>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-navy">Live Order Sheet</h2>
                <p className="text-sm font-semibold text-muted">
                  New orders from your connected webshop appear here in real time.
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
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Amount</th>
                    <th className="px-2 py-2">Status</th>
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
                        <td className="px-2 py-2.5 font-semibold text-navy/90">
                          {o.customer.first_name || "—"}
                        </td>
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
              Name · email · phone · order amount · reference
            </p>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
