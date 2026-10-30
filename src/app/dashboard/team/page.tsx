"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import DashboardIcon from "@/components/DashboardIcon";
import { DashboardHeading, Panel, StatusPill } from "@/components/DashboardPrimitives";
import { useWorkspace } from "@/store/WorkspaceContext";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";
import { formatApiError } from "@/lib/auth";
import {
  ApiError,
  cancelTeamInvitation,
  createTeamInvitation,
  listTeamInvitations,
  listTeamMembers,
  removeTeamMember,
  resendTeamInvitation,
  suspendTeamMember,
  updateTeamMember,
  type TeamInvitation,
  type TeamMember,
} from "@/lib/workspaceCompliance";

function roleLabel(role: string): string {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  if (role === "employee") return "Medewerker";
  return role;
}

function relativeNl(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });
}

export default function DashboardTeamPage() {
  const { workspaceId, revision, current } = useWorkspace();
  const { session } = useSession();
  const { pushToast } = useShopBonus();
  const myRole = current?.role ?? "";
  const canManage = myRole === "owner" || myRole === "manager";

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "employee">("employee");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [m, i] = await Promise.all([
        listTeamMembers(workspaceId),
        listTeamInvitations(workspaceId),
      ]);
      if (signal?.aborted) return;
      setMembers(m);
      setInvitations(i);
    } catch (err) {
      if (signal?.aborted) return;
      pushToast({
        title: "Team laden mislukt",
        message: formatApiError(err, "Geen toegang of netwerkfout."),
        kind: "error",
      });
      setMembers([]);
      setInvitations([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [workspaceId, pushToast]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load, revision]);

  const invite = async () => {
    if (!canManage) return;
    setBusy(true);
    try {
      await createTeamInvitation({ email: email.trim().toLowerCase(), role }, workspaceId);
      setEmail("");
      pushToast({ title: "Uitnodiging verstuurd", message: "De ontvanger krijgt een beveiligde link.", kind: "success" });
      await load();
    } catch (err) {
      pushToast({ title: "Uitnodigen mislukt", message: formatApiError(err, "Controleer e-mail en rol."), kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onResend = async (id: string) => {
    setBusy(true);
    try {
      await resendTeamInvitation(id, workspaceId);
      pushToast({ title: "Opnieuw verstuurd", message: "De uitnodiging is opnieuw verzonden.", kind: "success" });
      await load();
    } catch (err) {
      pushToast({ title: "Opnieuw versturen mislukt", message: formatApiError(err, "Wacht op cooldown."), kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async (id: string) => {
    setBusy(true);
    try {
      await cancelTeamInvitation(id, workspaceId);
      pushToast({ title: "Uitnodiging geannuleerd", message: "De link is niet meer geldig.", kind: "success" });
      await load();
    } catch (err) {
      pushToast({ title: "Annuleren mislukt", message: formatApiError(err, "Probeer opnieuw."), kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (member: TeamMember, nextRole: string) => {
    if (!canManage || member.role === "owner") return;
    if (myRole === "manager" && nextRole === "owner") {
      pushToast({ title: "Niet toegestaan", message: "Managers kunnen geen owner toewijzen.", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      await updateTeamMember(member.id, { role: nextRole }, workspaceId);
      pushToast({ title: "Rol bijgewerkt", message: `${member.first_name} is nu ${roleLabel(nextRole)}.`, kind: "success" });
      await load();
    } catch (err) {
      pushToast({ title: "Rol wijzigen mislukt", message: formatApiError(err, "Rechten ontoereikend."), kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onSuspend = async (member: TeamMember) => {
    setBusy(true);
    try {
      await suspendTeamMember(member.id, workspaceId);
      pushToast({ title: "Lid geschorst", message: "Workspace-toegang is direct ingetrokken.", kind: "success" });
      await load();
    } catch (err) {
      pushToast({ title: "Schorsen mislukt", message: formatApiError(err, "Laatste owner kan niet worden verwijderd."), kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (member: TeamMember) => {
    if (member.id === session?.user.id) return;
    setBusy(true);
    try {
      await removeTeamMember(member.id, workspaceId);
      pushToast({ title: "Lid verwijderd", message: "Toegang is direct ingetrokken.", kind: "success" });
      await load();
    } catch (err) {
      const message = formatApiError(err, "Laatste owner kan niet worden verwijderd.");
      pushToast({ title: "Verwijderen mislukt", message, kind: "error" });
      if (!(err instanceof ApiError)) {
        /* keep */
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell>
      <DashboardHeading
        title="Team"
        accent="& toegang"
        subtitle="Nodig medewerkers uit, beheer rollen en trek toegang direct in."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,.7fr)]">
        <Panel>
          <h2 className="text-xl font-black text-navy">Leden</h2>
          <p className="mt-1 text-sm text-muted">Actieve memberships voor deze workspace.</p>
          {loading ? (
            <p className="mt-6 text-sm text-muted">Laden…</p>
          ) : members.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-blue-50 px-4 py-6 text-sm text-muted">Nog geen leden zichtbaar.</p>
          ) : (
            <ul className="mt-5 divide-y divide-blue-50">
              {members.map((m) => (
                <li key={m.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-extrabold text-navy">{m.first_name}</p>
                    <p className="text-sm text-muted">{m.email}</p>
                    <p className="mt-1 text-xs text-muted">Laatste activiteit: {relativeNl(m.last_activity_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={m.status === "active" ? "Actief" : m.status} />
                    {canManage && m.role !== "owner" ? (
                      <select
                        value={m.role}
                        disabled={busy}
                        onChange={(e) => void changeRole(m, e.target.value)}
                        className="rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-xs font-bold text-navy"
                      >
                        <option value="manager">Manager</option>
                        <option value="employee">Medewerker</option>
                      </select>
                    ) : (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-brand">
                        {roleLabel(m.role)}
                      </span>
                    )}
                    {canManage && m.role !== "owner" && m.id !== session?.user.id && (
                      <>
                        {m.status === "active" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onSuspend(m)}
                            className="rounded-lg px-2 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50"
                          >
                            Schors
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onRemove(m)}
                          className="rounded-lg px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          Verwijder
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          {canManage && (
            <Panel>
              <h2 className="text-xl font-black text-navy">Uitnodigen</h2>
              <p className="mt-1 text-sm text-muted">Managers kunnen geen owner-rol toewijzen.</p>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-bold text-navy">E-mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-blue-100 px-4 py-3 text-sm outline-none focus:border-brand"
                  placeholder="collega@bedrijf.nl"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-sm font-bold text-navy">Rol</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "manager" | "employee")}
                  className="w-full rounded-xl border border-blue-100 px-4 py-3 text-sm outline-none focus:border-brand"
                >
                  {myRole === "owner" && <option value="manager">Manager</option>}
                  <option value="employee">Medewerker</option>
                </select>
              </label>
              <button
                type="button"
                disabled={busy || !email.includes("@")}
                onClick={() => void invite()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"
              >
                <DashboardIcon name="plus" size={16} />
                Uitnodiging versturen
              </button>
            </Panel>
          )}

          <Panel>
            <h2 className="text-xl font-black text-navy">Openstaande uitnodigingen</h2>
            {loading ? (
              <p className="mt-4 text-sm text-muted">Laden…</p>
            ) : invitations.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Geen openstaande uitnodigingen.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {invitations.map((inv) => (
                  <li key={inv.id} className="rounded-2xl border border-blue-50 bg-blue-50/40 p-3">
                    <p className="text-sm font-extrabold text-navy">{inv.email}</p>
                    <p className="text-xs text-muted">
                      {roleLabel(inv.role)} · {inv.status} · verloopt {relativeNl(inv.expires_at)}
                    </p>
                    {canManage && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onResend(inv.id)}
                          className="text-xs font-bold text-brand hover:underline"
                        >
                          Opnieuw
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onCancel(inv.id)}
                          className="text-xs font-bold text-red-600 hover:underline"
                        >
                          Annuleer
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
