"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/DashboardPrimitives";
import { confirmPassword } from "@/lib/profile";
import { formatApiError } from "@/lib/auth";
import { changeOwnershipTransfer, fetchOwnershipTransfer, fetchAccessHistory, permissionLabel, accessEventLabel, type TeamMember, type OwnershipTransfer, type AccessHistory } from "@/lib/workspaceCompliance";

function transferLabel(status: string): string {
  return ({ pending: "Wacht op acceptatie", accepted: "Geaccepteerd", cancelled: "Geannuleerd", declined: "Geweigerd", expired: "Verlopen" } as Record<string, string>)[status] ?? "Niet beschikbaar";
}

export function PermissionEditor({ allowed, value, onChange, disabled = false }: {
  allowed: string[]; value: string[]; onChange: (value: string[]) => void; disabled?: boolean;
}) {
  return <fieldset disabled={disabled} className="mt-3 space-y-2">
    <legend className="text-sm font-bold text-navy">Aanvullende rechten</legend>
    <p className="text-xs text-muted">Rolrechten blijven actief. Alleen rechten die je zelf hebt, kunnen worden toegevoegd.</p>
    <div className="grid gap-2 sm:grid-cols-2">{Array.from(new Set([...allowed, ...value])).sort().map((p) => <label key={p} className="flex items-center gap-2 text-xs">
      <input type="checkbox" checked={value.includes(p)} disabled={!allowed.includes(p)} onChange={(e) => onChange(e.target.checked ? [...value, p] : value.filter((v) => v !== p))} />{permissionLabel(p)}
    </label>)}</div>
  </fieldset>;
}

export default function TeamAccessManagement({ workspaceId, userId, owner, canManage, members, onChanged }: {
  workspaceId: string; userId?: string; owner: boolean; canManage: boolean; members: TeamMember[]; onChanged: () => Promise<void>;
}) {
  const [transfer, setTransfer] = useState<OwnershipTransfer | null>(null);
  const [history, setHistory] = useState<AccessHistory | null>(null);
  const [page, setPage] = useState(1);
  const [member, setMember] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.all([fetchOwnershipTransfer(workspaceId), canManage ? fetchAccessHistory(workspaceId, page) : Promise.resolve(null)])
      .then(([t, h]) => { if (active) { setTransfer(t); setHistory(h); } })
      .catch((e) => { if (active) setError(formatApiError(e, "Toegangsgegevens laden mislukt.")); });
    return () => { active = false; };
  }, [workspaceId, canManage, page, version, members]);

  const act = async (action: "start" | "accept" | "cancel") => {
    setBusy(true); setError(""); setStatus("");
    const confirmation = password;
    setPassword("");
    try {
      if (action !== "cancel") await confirmPassword(confirmation);
      const result = await changeOwnershipTransfer(workspaceId, action, member);
      setTransfer(result);
      setStatus(`Overdracht: ${transferLabel(result.status)}`);
      await onChanged();
      setVersion((v) => v + 1);
    } catch (e) { setError(formatApiError(e, "Overdracht mislukt. Controleer de actuele status.")); }
    finally { setBusy(false); }
  };
  const pending = transfer?.status === "pending" && new Date(transfer.expires_at).getTime() > now;
  const recipient = transfer?.to.id === userId;
  return <div className="mt-5 grid gap-5 lg:grid-cols-2">
    <Panel>
      <h2 className="text-xl font-black text-navy">Eigendom overdragen</h2>
      <p className="mt-2 text-sm text-muted">De ontvanger moet accepteren. Daarna wordt de huidige owner manager.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {status && <p role="status" className="mt-3 text-sm">{status}</p>}
      {transfer && <p className="mt-3 text-sm">{transfer.from.first_name} → {transfer.to.first_name}: {transferLabel(pending ? transfer.status : transfer.status === "pending" ? "expired" : transfer.status)}. Geldig tot {new Date(transfer.expires_at).toLocaleString("nl-NL")}</p>}
      {!pending && owner && <label className="mt-3 block text-sm">Nieuwe owner<select aria-label="Nieuwe owner" value={member} onChange={(e) => setMember(e.target.value)} className="mt-1 w-full rounded-xl border p-3">
        <option value="">Kies een actief lid</option>{members.filter((m) => m.status === "active" && m.role !== "owner" && m.id !== userId).map((m) => <option key={m.id} value={m.id}>{m.first_name} ({m.email})</option>)}
      </select></label>}
      {((!pending && owner) || (pending && recipient)) && <label className="mt-3 block text-sm">Bevestig je wachtwoord<input aria-label="Bevestig je wachtwoord" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label>}
      <div className="mt-4 flex flex-wrap gap-3">
        {!pending && owner && <button disabled={busy || !member || !password} onClick={() => void act("start")} className="rounded-xl bg-brand p-3 text-sm font-bold text-white disabled:opacity-50">Overdracht starten</button>}
        {pending && recipient && <button disabled={busy || !password} onClick={() => void act("accept")} className="rounded-xl bg-brand p-3 text-sm font-bold text-white disabled:opacity-50">Eigendom accepteren</button>}
        {pending && (recipient || transfer?.from.id === userId) && <button disabled={busy} onClick={() => void act("cancel")} className="p-3 text-sm font-bold text-red-600">{recipient ? "Overdracht weigeren" : "Overdracht annuleren"}</button>}
        <button disabled={busy} onClick={() => { setHistory(null); setError(""); setVersion((v) => v + 1); }} className="p-3 text-sm font-bold text-brand">Status vernieuwen</button>
      </div>
    </Panel>
    {canManage && <Panel><h2 className="text-xl font-black text-navy">Toegangsgeschiedenis</h2>
      <p className="mt-2 text-sm text-muted">Team- en eigendomswijzigingen uit het auditlog van deze webshop.</p>
      {!history ? <p className="mt-4 text-sm">{error ? "Geschiedenis niet beschikbaar." : "Laden…"}</p> : <>
        <ul className="mt-4 space-y-3">{history.data.map((event, i) => <li key={`${event.occurred_at}-${i}`} className="break-words text-sm"><p className="font-bold">{accessEventLabel(event.action)} · {event.outcome === "success" ? "Geslaagd" : event.outcome === "denied" ? "Geweigerd" : "Mislukt"}</p><time>{new Date(event.occurred_at).toLocaleString("nl-NL")}</time></li>)}</ul>
        {history.data.length === 0 && <p className="mt-4 text-sm">Geen toegangsgebeurtenissen.</p>}
        <div className="mt-4 flex gap-4"><button disabled={busy || page <= 1} onClick={() => setPage((p) => p - 1)}>Vorige</button><span>{history.meta.current_page} / {history.meta.last_page}</span><button disabled={busy || page >= history.meta.last_page} onClick={() => setPage((p) => p + 1)}>Volgende</button></div>
      </>}
    </Panel>}
  </div>;
}
