"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import DashboardIcon from "@/components/DashboardIcon";
import { ApiError } from "@/lib/api";
import {
  fetchPlatformDeliveries,
  fetchPlatformEvents,
  fetchPlatformNotificationSettings,
  fetchPlatformTemplates,
  generatePlatformTemplates,
  publishPlatformTemplate,
  retryPlatformDelivery,
  retryPlatformEvent,
  rollbackPlatformTemplate,
  testPlatformTemplate,
  updatePlatformNotificationSettings,
  type PlatformDelivery,
  type PlatformEventDef,
  type PlatformNotificationSettings,
  type PlatformTemplate,
} from "@/lib/notifications";

type Tab = "overview" | "templates" | "events" | "reminders" | "deliveries" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "templates", label: "Templates" },
  { id: "events", label: "Events" },
  { id: "reminders", label: "Reminders" },
  { id: "deliveries", label: "Delivery logs" },
  { id: "settings", label: "Settings" },
];

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function PlatformNotificationsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [templates, setTemplates] = useState<PlatformTemplate[]>([]);
  const [events, setEvents] = useState<PlatformEventDef[]>([]);
  const [failures, setFailures] = useState<
    Array<{ id: string; event_type: string; attempts: number; error_code: string | null }>
  >([]);
  const [deliveries, setDeliveries] = useState<PlatformDelivery[]>([]);
  const [ops, setOps] = useState<{ failed_events: number; locale_fallbacks: number } | null>(null);
  const [settings, setSettings] = useState<PlatformNotificationSettings | null>(null);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [generateEvent, setGenerateEvent] = useState("cashback_credited");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [settingsDraft, setSettingsDraft] = useState({
    voucher_reminder_days: "30,7,1",
    offer_expiry_days: "7",
    retention_days: "90",
    reason: "Update notification policy",
  });

  const load = useCallback(async () => {
    setError(null);
    const [tpl, ev, del, pol] = await Promise.all([
      fetchPlatformTemplates({ per_page: 50 }),
      fetchPlatformEvents(),
      fetchPlatformDeliveries({ per_page: 25 }),
      fetchPlatformNotificationSettings(),
    ]);
    setTemplates(tpl.data);
    setEvents(ev.data);
    setFailures(ev.failures);
    setDeliveries(del.data);
    setOps(del.operations);
    setSettings(pol.data);
    setEmailAvailable(pol.email_delivery_available);
    setSettingsDraft({
      voucher_reminder_days: (pol.data.voucher_reminder_days ?? [30, 7, 1]).join(","),
      offer_expiry_days: String(pol.data.offer_expiry_days ?? 7),
      retention_days: String(pol.data.retention_days ?? 90),
      reason: "Update notification policy",
    });
  }, []);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof ApiError ? err.message : "Laden mislukt."));
  }, [load]);

  const publishedCount = useMemo(() => templates.filter((t) => t.is_current).length, [templates]);
  const draftCount = useMemo(
    () => templates.filter((t) => t.status === "draft" || t.status === "review").length,
    [templates]
  );

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(ok);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Actie mislukt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell admin>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-brand">OpenAI 6</p>
          <h1 className="text-3xl font-black text-navy sm:text-4xl">Notification center</h1>
          <p className="mt-1 text-sm text-muted">
            Templates, events, reminders and delivery control for ShopBonus.
          </p>
        </div>
        <Link
          href="/admin/notifications"
          className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-extrabold text-brand hover:bg-blue-50"
        >
          Mijn inbox
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
              tab === item.id ? "bg-brand text-white" : "bg-white text-navy ring-1 ring-blue-100 hover:bg-blue-50"
            }`}
            data-testid={`platform-notifications-tab-${item.id}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          {notice}
        </div>
      )}

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Published templates", publishedCount],
            ["Draft / review", draftCount],
            ["Failed events", ops?.failed_events ?? failures.length],
            ["Locale fallbacks", ops?.locale_fallbacks ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
              <p className="mt-2 text-3xl font-black text-navy">{value}</p>
            </div>
          ))}
          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-4">
            <h2 className="text-lg font-black text-navy">Delivery readiness</h2>
            <p className="mt-2 text-sm text-muted">
              Email transport:{" "}
              <strong className={emailAvailable ? "text-green-700" : "text-amber-700"}>
                {emailAvailable ? "available" : "disabled / unavailable"}
              </strong>
              . AI drafts never publish automatically — test, then independent publish.
            </p>
          </div>
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-5">
          <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-navy">Generate with OpenAI</h2>
            <p className="mt-1 text-sm text-muted">
              Creates private NL/EN drafts. Requires step-up. Never auto-publishes.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm font-bold text-navy">
                Event
                <select
                  value={generateEvent}
                  onChange={(e) => setGenerateEvent(e.target.value)}
                  className="mt-1 block rounded-xl border border-blue-100 px-3 py-2 text-sm"
                >
                  {events.map((ev) => (
                    <option key={ev.event_type} value={ev.event_type}>
                      {ev.event_type} ({ev.audience})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await generatePlatformTemplates(generateEvent, newIdempotencyKey());
                  }, "Draft templates generated.")
                }
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
              >
                Generate NL/EN drafts
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-navy">Template versions</h2>
            <div className="space-y-3">
              {templates.length === 0 && <p className="text-sm text-muted">Nog geen templates.</p>}
              {templates.map((tpl) => (
                <article key={tpl.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-navy">{tpl.key}</p>
                      <p className="text-xs text-muted">
                        v{tpl.version} · {tpl.status}
                        {tpl.is_current ? " · current" : ""}
                      </p>
                      <p className="mt-2 text-sm font-bold text-navy">{tpl.value.title}</p>
                      <p className="text-sm text-muted">{tpl.value.body}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(tpl.status === "draft" || tpl.status === "review") && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const report = await testPlatformTemplate(tpl.id);
                                setPreview(report);
                              }, "Template tested (synthetic).")
                            }
                            className="rounded-lg border border-blue-100 px-3 py-2 text-xs font-extrabold text-brand"
                          >
                            Test
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                async () => {
                                  await publishPlatformTemplate(tpl.id, "Publish approved notification template");
                                },
                                "Publish requested (second admin required)."
                              )
                            }
                            className="rounded-lg bg-brand px-3 py-2 text-xs font-extrabold text-white"
                          >
                            Publish
                          </button>
                        </>
                      )}
                      {tpl.is_current && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await rollbackPlatformTemplate(tpl.id, "Rollback to previous notification template");
                            }, "Rollback draft created — test and publish independently.")
                          }
                          className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-extrabold text-amber-700"
                        >
                          Rollback
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {preview && (
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-green-200">
                {JSON.stringify(preview, null, 2)}
              </pre>
            )}
          </section>
        </div>
      )}

      {tab === "events" && (
        <div className="space-y-5">
          <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-navy">Event catalogue</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="px-2 py-2">Event</th>
                    <th className="px-2 py-2">Audience</th>
                    <th className="px-2 py-2">In-app</th>
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Reminders</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.event_type} className="border-t border-slate-100">
                      <td className="px-2 py-2 font-bold text-navy">{ev.event_type}</td>
                      <td className="px-2 py-2">{ev.audience}</td>
                      <td className="px-2 py-2">{ev.mandatory_in_app ? "required" : "optional"}</td>
                      <td className="px-2 py-2">{ev.mandatory_email ? "mandatory" : "optional"}</td>
                      <td className="px-2 py-2">
                        {ev.reminder_days.length ? ev.reminder_days.join(", ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-navy">Failed outbox events</h2>
            {failures.length === 0 && <p className="text-sm text-muted">Geen mislukte events.</p>}
            {failures.map((f) => (
              <div key={f.id} className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50/40 p-3">
                <div>
                  <p className="font-extrabold text-navy">{f.event_type}</p>
                  <p className="text-xs text-muted">
                    {f.id} · attempts {f.attempts} · {f.error_code ?? "unknown"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await retryPlatformEvent(f.id, "Reviewed outbox retry after delivery investigation");
                    }, "Event retry queued.")
                  }
                  className="rounded-lg bg-brand px-3 py-2 text-xs font-extrabold text-white"
                >
                  Retry
                </button>
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === "reminders" && (
        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-navy">Automatic reminders</h2>
          <p className="mt-1 text-sm text-muted">
            Driven by Laravel scheduler (`shopbonus:dispatch-notifications`) and published policy.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-navy">
            <li className="flex gap-3 rounded-2xl bg-blue-50/60 p-3">
              <DashboardIcon name="ticket" size={18} className="mt-0.5 text-brand" />
              <span>
                <strong>Voucher expiry</strong> — days{" "}
                {(settings?.voucher_reminder_days ?? [30, 7, 1]).join(" / ")}. Only active usable vouchers.
              </span>
            </li>
            <li className="flex gap-3 rounded-2xl bg-blue-50/60 p-3">
              <DashboardIcon name="tag" size={18} className="mt-0.5 text-brand" />
              <span>
                <strong>Offer expiry</strong> — {settings?.offer_expiry_days ?? 7} days before active offer ends.
              </span>
            </li>
            <li className="flex gap-3 rounded-2xl bg-blue-50/60 p-3">
              <DashboardIcon name="chat" size={18} className="mt-0.5 text-brand" />
              <span>
                <strong>Support replies</strong> — event-driven when a human reply is persisted.
              </span>
            </li>
            <li className="flex gap-3 rounded-2xl bg-blue-50/60 p-3">
              <DashboardIcon name="store" size={18} className="mt-0.5 text-brand" />
              <span>
                <strong>Favorite merchant offers</strong> — optional, preference + consent gated.
              </span>
            </li>
          </ul>
        </section>
      )}

      {tab === "deliveries" && (
        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-navy">Delivery logs</h2>
          <div className="space-y-3">
            {deliveries.length === 0 && <p className="text-sm text-muted">Geen deliveries.</p>}
            {deliveries.map((d) => (
              <article key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3">
                <div>
                  <p className="font-extrabold text-navy">
                    {d.channel} · {d.status}
                  </p>
                  <p className="text-xs text-muted">
                    {d.id} · attempts {d.attempts}
                    {d.error_code ? ` · ${d.error_code}` : ""}
                    {d.sent_at ? ` · sent ${d.sent_at}` : ""}
                  </p>
                </div>
                {(d.status === "failed" || d.status === "uncertain") && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await retryPlatformDelivery(
                          d.id,
                          "Reviewed delivery retry after transport investigation",
                          d.status === "uncertain"
                        );
                      }, "Delivery retry authorized.")
                    }
                    className="rounded-lg border border-blue-100 px-3 py-2 text-xs font-extrabold text-brand"
                  >
                    Retry
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "settings" && (
        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-navy">Notification policy</h2>
          <p className="mt-1 text-sm text-muted">
            Saves a private draft. Use existing platform-settings review/publish for activation.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-navy">
              Voucher reminder days
              <input
                value={settingsDraft.voucher_reminder_days}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, voucher_reminder_days: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
                placeholder="30,7,1"
              />
            </label>
            <label className="text-sm font-bold text-navy">
              Offer expiry days
              <input
                value={settingsDraft.offer_expiry_days}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, offer_expiry_days: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
              />
            </label>
            <label className="text-sm font-bold text-navy">
              Retention days
              <input
                value={settingsDraft.retention_days}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, retention_days: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
              />
            </label>
            <label className="text-sm font-bold text-navy">
              Reason
              <input
                value={settingsDraft.reason}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, reason: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const days = settingsDraft.voucher_reminder_days
                  .split(",")
                  .map((v) => Number(v.trim()))
                  .filter((n) => Number.isFinite(n) && n > 0);
                await updatePlatformNotificationSettings(
                  {
                    voucher_reminder_days: days,
                    offer_expiry_days: Number(settingsDraft.offer_expiry_days),
                    retention_days: Number(settingsDraft.retention_days),
                    email_enabled: settings?.email_enabled ?? true,
                  },
                  settingsDraft.reason
                );
              }, "Policy draft saved.")
            }
            className="mt-4 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
          >
            Save policy draft
          </button>
        </section>
      )}
    </DashboardShell>
  );
}
