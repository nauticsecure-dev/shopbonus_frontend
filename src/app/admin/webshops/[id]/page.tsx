"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import AdminStepUpModal from "@/components/AdminStepUpModal";
import {
  approveWebshop,
  fetchAdminWebshop,
  rejectWebshop,
  requestWebshopInformation,
  suspendWebshop,
  unsuspendWebshop,
  type AdminWebshop,
  type ApprovalChecklist,
} from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";

type ActionKind = "approve" | "reject" | "suspend" | "unsuspend" | "info" | null;

const CHECKLIST_LABELS: Record<keyof ApprovalChecklist, string> = {
  business_identity: "Bedrijfsidentiteit",
  ownership_verified: "Eigendomsverificatie",
  company_information_confirmed: "Bedrijfsgegevens bevestigd",
  agreement_accepted: "Merchant agreement geaccepteerd",
  owner_account_active: "Account/security eigenaar",
};

export default function AdminWebshopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AdminWebshop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [action, setAction] = useState<ActionKind>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const shop = await fetchAdminWebshop(id);
      if (signal?.aborted) return;
      setData(shop);
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

  const checklist = data?.approval_checklist;
  const checklistReady = checklist
    ? Object.values(checklist).every(Boolean)
    : false;

  const runMutation = async () => {
    if (!data || !action) return;
    if (action === "info") {
      await requestWebshopInformation(data.id, infoMessage.trim());
      setNotice("Informatieverzoek verstuurd naar de merchant.");
    } else if (action === "approve") {
      await approveWebshop(data.id, reason.trim() || "Approved after checklist review");
      setNotice("Webshop goedgekeurd.");
    } else if (action === "reject") {
      await rejectWebshop(data.id, reason.trim());
      setNotice("Webshop afgewezen.");
    } else if (action === "suspend") {
      await suspendWebshop(data.id, reason.trim());
      setNotice("Webshop geschorst — API-toegang ingetrokken.");
    } else if (action === "unsuspend") {
      await unsuspendWebshop(data.id, reason.trim());
      setNotice("Webshop opnieuw geactiveerd.");
    }
    setReason("");
    setInfoMessage("");
    await load();
  };

  const openAction = (kind: ActionKind) => {
    setNotice(null);
    setError(null);
    if (kind === "approve" && !checklistReady) {
      setError("Goedkeuren geblokkeerd: verplichte checklistitems ontbreken.");
      return;
    }
    if ((kind === "reject" || kind === "suspend" || kind === "unsuspend") && reason.trim().length < 5) {
      setError("Geef een reden van minstens 5 tekens.");
      return;
    }
    if (kind === "info" && infoMessage.trim().length < 10) {
      setError("Bericht voor informatieverzoek moet minstens 10 tekens zijn.");
      return;
    }
    setAction(kind);
  };

  return (
    <AdminListPage title="Webshop" accent={data?.name ?? id} backHref="/admin/webshops">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-3 text-sm font-semibold text-green-700">{notice}</p>}
      {!error && !data && <p className="text-sm text-muted">Laden…</p>}

      {data && (
        <div className="space-y-6">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-bold text-muted">Status</dt>
              <dd className="font-extrabold text-navy">{data.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">Integratie</dt>
              <dd className="font-extrabold text-navy">{data.integration_status ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">Actieve offers</dt>
              <dd className="font-extrabold text-navy">{data.active_offers ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">Eigendom</dt>
              <dd className="font-extrabold text-navy">
                {data.ownership_verified ? `Geverifieerd (${data.ownership_method ?? "—"})` : "Niet geverifieerd"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">Domein</dt>
              <dd className="font-extrabold text-navy">{data.verified_domain || data.website_domain || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">Laatste activiteit</dt>
              <dd className="font-extrabold text-navy">
                {data.last_activity_at ? new Date(data.last_activity_at).toLocaleString() : "—"}
              </dd>
            </div>
          </dl>

          {checklist && (
            <section>
              <h3 className="mb-2 text-sm font-black text-navy">Goedkeuringschecklist</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(CHECKLIST_LABELS) as Array<keyof ApprovalChecklist>).map((key) => (
                  <li
                    key={key}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                      checklist[key] ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {checklist[key] ? "✓" : "✗"} {CHECKLIST_LABELS[key]}
                  </li>
                ))}
              </ul>
              {!checklistReady && (
                <p className="mt-2 text-xs font-semibold text-amber-800">
                  Goedkeuren omzeilt ontbrekende verplichte verificatie niet.
                </p>
              )}
            </section>
          )}

          {data.owners && data.owners.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-black text-navy">Eigenaren</h3>
              <ul className="space-y-1 text-sm">
                {data.owners.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/users/${o.id}`} className="font-extrabold text-brand">
                      {o.first_name} · {o.email}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.verifications && data.verifications.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-black text-navy">Ownership evidence</h3>
              <ul className="space-y-2 text-sm">
                {data.verifications.map((v, i) => (
                  <li key={v.id ?? i} className="rounded-xl border border-blue-50 bg-slate-50 px-3 py-2">
                    <p className="font-bold text-navy">Status: {v.status ?? "—"}</p>
                    {v.notes && <p className="text-muted">{v.notes}</p>}
                    {v.evidence_files?.map((f) => (
                      <a
                        key={f.id}
                        href={`/api/v1/admin/webshops/${data.id}/evidence/${f.id}`}
                        className="mr-3 text-xs font-extrabold text-brand"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {f.name} ({Math.round(f.size / 1024)} KB)
                      </a>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.agreement_acceptances && data.agreement_acceptances.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-black text-navy">Agreements</h3>
              <ul className="text-sm text-muted">
                {data.agreement_acceptances.map((a) => (
                  <li key={a.id}>
                    v{a.version} · {a.signatory_name} · {new Date(a.accepted_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            <Link href={`/admin/vouchers?webshop=${data.id}`} className="font-extrabold text-brand">
              Vouchers
            </Link>
            <Link href={`/admin/activity?webshop=${data.id}`} className="font-extrabold text-brand">
              Activiteit
            </Link>
            <Link href={`/admin/integrations?webshop=${data.id}`} className="font-extrabold text-brand">
              Integratiegezondheid
            </Link>
          </div>

          <section className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <h3 className="text-sm font-black text-navy">Adminacties</h3>
            <label className="block text-xs font-bold text-muted">
              Reden (vereist voor reject / suspend / unsuspend)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-brand"
                placeholder="Min. 5 tekens…"
              />
            </label>
            <label className="block text-xs font-bold text-muted">
              Extra informatie vragen
              <textarea
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-brand"
                placeholder="Min. 10 tekens…"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {data.status === "pending_review" && (
                <>
                  <button
                    type="button"
                    onClick={() => openAction("approve")}
                    className="rounded-xl bg-green-600 px-3 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                    disabled={!checklistReady}
                    data-testid="webshop-approve"
                  >
                    Goedkeuren
                  </button>
                  <button
                    type="button"
                    onClick={() => openAction("reject")}
                    className="rounded-xl bg-red-600 px-3 py-2 text-sm font-extrabold text-white"
                    data-testid="webshop-reject"
                  >
                    Afwijzen
                  </button>
                </>
              )}
              {data.status === "approved" && (
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
                  onClick={() => openAction("unsuspend")}
                  className="rounded-xl bg-brand px-3 py-2 text-sm font-extrabold text-white"
                >
                  Heractiveren
                </button>
              )}
              <button
                type="button"
                onClick={() => openAction("info")}
                className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-extrabold text-navy"
              >
                Extra info vragen
              </button>
            </div>
          </section>
        </div>
      )}

      <AdminStepUpModal
        open={action !== null}
        title={
          action === "approve"
            ? "Webshop goedkeuren"
            : action === "reject"
              ? "Webshop afwijzen"
              : action === "suspend"
                ? "Webshop schorsen"
                : action === "unsuspend"
                  ? "Webshop heractiveren"
                  : "Informatie vragen"
        }
        description="Bevestig je wachtwoord om door te gaan. Gevoelige statuswijzigingen vereisen recente authenticatie."
        requireOtp={false}
        onClose={() => setAction(null)}
        onReady={runMutation}
      />
    </AdminListPage>
  );
}
