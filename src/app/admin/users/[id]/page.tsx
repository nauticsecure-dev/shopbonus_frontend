"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import AdminStepUpModal from "@/components/AdminStepUpModal";
import {
  fetchAdminUser,
  reactivateUser,
  resetUserSecurity,
  revokeMembership,
  revokeSuperAdmin,
  startSupportSession,
  suspendUser,
  type AdminUser,
} from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";
import { setSupportSession } from "@/lib/supportSession";
import { useSession } from "@/store/SessionContext";

type ActionKind =
  | "suspend"
  | "reactivate"
  | "reset-security"
  | "revoke-super-admin"
  | "support-session"
  | { type: "revoke-membership"; webshopId: string }
  | null;

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { refresh } = useSession();
  const [data, setData] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<ActionKind>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const user = await fetchAdminUser(id);
      if (signal?.aborted) return;
      setData(user);
      setError(null);
    } catch (err) {
      if (!signal?.aborted) setError(formatApiError(err, "Laden mislukt."));
    }
  }, [id]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const needsOtp = (kind: ActionKind) =>
    kind === "reset-security" || kind === "revoke-super-admin" || kind === "support-session";

  const openAction = (kind: ActionKind) => {
    setNotice(null);
    setError(null);
    const min = kind === "support-session" ? 10 : 5;
    if ((!kind || typeof kind === "string") && reason.trim().length < min) {
      setError(`Geef een reden van minstens ${min} tekens.`);
      return;
    }
    if (typeof kind === "object" && kind?.type === "revoke-membership" && reason.trim().length < 5) {
      setError("Geef een reden van minstens 5 tekens.");
      return;
    }
    setAction(kind);
  };

  const runMutation = async () => {
    if (!data || !action) return;
    if (action === "suspend") {
      await suspendUser(data.id, reason.trim());
      setNotice("Account geschorst.");
    } else if (action === "reactivate") {
      await reactivateUser(data.id, reason.trim());
      setNotice("Account geheractiveerd.");
    } else if (action === "reset-security") {
      await resetUserSecurity(data.id, reason.trim());
      setNotice("Security access gereset (2FA uit, tokens ingetrokken).");
    } else if (action === "revoke-super-admin") {
      await revokeSuperAdmin(data.id, reason.trim());
      setNotice("Super Admin rol ingetrokken.");
    } else if (action === "support-session") {
      const session = await startSupportSession(data.id, reason.trim());
      if (!session.token) throw new Error("Geen support token ontvangen.");
      setSupportSession(session.token, session.id);
      await refresh();
      setNotice(`Support session gestart voor ${session.target.email}.`);
      router.push(pathForUser(session.target));
      return;
    } else if (typeof action === "object" && action.type === "revoke-membership") {
      await revokeMembership(action.webshopId, data.id, reason.trim());
      setNotice("Membership ingetrokken.");
    }
    setReason("");
    await load();
  };

  const isSuperAdmin = data?.platform_roles?.some((r) => r.role === "super_admin" && !r.revoked_at);

  return (
    <AdminListPage title="Gebruiker" accent={data?.first_name ?? id} backHref="/admin/users">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-3 text-sm font-semibold text-green-700">{notice}</p>}
      {!error && !data && <p className="text-sm text-muted">Laden…</p>}

      {data && (
        <div className="space-y-6">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-bold text-muted">E-mail</dt>
              <dd className="font-extrabold text-navy">{data.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">Status</dt>
              <dd className="font-extrabold text-navy">{data.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">2FA</dt>
              <dd className="font-extrabold text-navy">{data.two_factor_enabled ? "Aan" : "Uit"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">Laatste login</dt>
              <dd className="font-extrabold text-navy">
                {data.last_login_at ? new Date(data.last_login_at).toLocaleString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">API tokens</dt>
              <dd className="font-extrabold text-navy">{data.api_tokens ?? 0}</dd>
            </div>
          </dl>

          {data.platform_roles && data.platform_roles.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-black text-navy">Platformrollen</h3>
              <ul className="text-sm text-muted">
                {data.platform_roles.map((r, i) => (
                  <li key={`${r.role}-${i}`}>
                    {r.role} · via {r.granted_via}
                    {r.revoked_at ? ` · ingetrokken ${new Date(r.revoked_at).toLocaleDateString()}` : " · actief"}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.memberships && data.memberships.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-black text-navy">Memberships</h3>
              <ul className="divide-y divide-blue-50">
                {data.memberships.map((m) => (
                  <li key={`${m.webshop.id}-${m.role}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <div>
                      <Link href={`/admin/webshops/${m.webshop.id}`} className="font-extrabold text-brand">
                        {m.webshop.name}
                      </Link>
                      <p className="text-xs text-muted">
                        {m.role} · {m.status} · shop {m.webshop.status}
                      </p>
                    </div>
                    {m.status === "active" && (
                      <button
                        type="button"
                        onClick={() => openAction({ type: "revoke-membership", webshopId: m.webshop.id })}
                        className="text-xs font-extrabold text-red-600"
                      >
                        Membership intrekken
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.wallets && data.wallets.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-black text-navy">Wallets</h3>
              <ul className="text-sm text-muted">
                {data.wallets.map((w) => (
                  <li key={w.id}>
                    <Link href={`/admin/wallets?wallet=${w.id}`} className="font-extrabold text-brand">
                      {w.unit}
                    </Link>{" "}
                    · beschikbaar {w.available} · gereserveerd {w.reserved} · pending {w.pending}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <h3 className="text-sm font-black text-navy">Beveiliging & toegang</h3>
            <p className="text-xs text-muted">Wachtwoorden worden nooit gewijzigd of getoond via deze UI.</p>
            <label className="block text-xs font-bold text-muted">
              Reden
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-brand"
                placeholder="Ticketnummer / toelichting…"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {data.status === "active" && (
                <button
                  type="button"
                  onClick={() => openAction("suspend")}
                  className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-extrabold text-white"
                >
                  Schorsen
                </button>
              )}
              {data.status === "suspended" && (
                <button
                  type="button"
                  onClick={() => openAction("reactivate")}
                  className="rounded-xl bg-brand px-3 py-2 text-sm font-extrabold text-white"
                >
                  Heractiveren
                </button>
              )}
              <button
                type="button"
                onClick={() => openAction("reset-security")}
                className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-extrabold text-navy"
              >
                Reset security access
              </button>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => openAction("revoke-super-admin")}
                  className="rounded-xl bg-red-600 px-3 py-2 text-sm font-extrabold text-white"
                >
                  Revoke Super Admin
                </button>
              )}
              {!isSuperAdmin && data.status === "active" && (
                <button
                  type="button"
                  onClick={() => openAction("support-session")}
                  className="rounded-xl bg-navy px-3 py-2 text-sm font-extrabold text-white"
                  data-testid="start-support-session"
                >
                  Start support session
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      <AdminStepUpModal
        open={action !== null}
        title={
          action === "support-session"
            ? "Support session starten"
            : action === "reset-security"
              ? "Security access resetten"
              : action === "revoke-super-admin"
                ? "Super Admin intrekken"
                : typeof action === "object" && action?.type === "revoke-membership"
                  ? "Membership intrekken"
                  : action === "suspend"
                    ? "Gebruiker schorsen"
                    : "Gebruiker heractiveren"
        }
        description={
          needsOtp(action)
            ? "Wachtwoord + e-mail OTP vereist. Gevoelige acties blijven beperkt tijdens impersonatie."
            : "Bevestig je wachtwoord om door te gaan."
        }
        requireOtp={needsOtp(action)}
        onClose={() => setAction(null)}
        onReady={runMutation}
      />
    </AdminListPage>
  );
}

function pathForUser(target: { id: string }): string {
  // After impersonation, land on consumer home; merchant dashboard works if they have workspaces.
  void target;
  return "/mijn-voordelen";
}
