"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import DashboardIcon from "@/components/DashboardIcon";
import { DashboardHeading, Panel, StatusPill } from "@/components/DashboardPrimitives";
import { useWorkspace } from "@/store/WorkspaceContext";
import { useShopBonus } from "@/store/ShopBonusContext";
import { formatApiError } from "@/lib/auth";
import { fetchOnboarding } from "@/lib/onboarding";
import {
  fetchFullBusinessProfile,
  saveFullBusinessProfile,
  type FullBusinessProfile,
} from "@/lib/workspaceCompliance";

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    approved: "Goedgekeurd",
    draft: "Concept",
    pending_review: "In behandeling",
    awaiting_verification: "Wacht op verificatie",
    verification_failed: "Verificatie mislukt",
    rejected: "Afgekeurd",
    suspended: "Geschorst",
  };
  return map[status] ?? status;
}

export default function DashboardSettingsPage() {
  const { workspaceId, revision, current } = useWorkspace();
  const { pushToast } = useShopBonus();
  const [profile, setProfile] = useState<FullBusinessProfile | null>(null);
  const [webshopStatus, setWebshopStatus] = useState(current?.status ?? "draft");
  const [form, setForm] = useState({
    trading_name: "",
    legal_name: "",
    contact_email: "",
    website_url: "",
    contact_phone: "",
    main_contact_name: "",
    kvk_number: "",
    vat_number: "",
    address_line: "",
    postal_code: "",
    city: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [p, onboarding] = await Promise.all([
        fetchFullBusinessProfile(workspaceId),
        fetchOnboarding(workspaceId, signal),
      ]);
      if (signal?.aborted) return;
      setProfile(p);
      setWebshopStatus(onboarding.webshop_status);
      setForm({
        trading_name: p.trading_name ?? "",
        legal_name: p.legal_name ?? "",
        contact_email: p.contact_email ?? "",
        website_url: p.website_url ?? "",
        contact_phone: p.contact_phone ?? "",
        main_contact_name: p.main_contact_name ?? "",
        kvk_number: p.kvk_number ?? "",
        vat_number: p.vat_number ?? "",
        address_line: p.address_line ?? "",
        postal_code: p.postal_code ?? "",
        city: p.city ?? "",
      });
    } catch (err) {
      if (signal?.aborted) return;
      pushToast({
        title: "Instellingen laden mislukt",
        message: formatApiError(err, "Probeer opnieuw."),
        kind: "error",
      });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [workspaceId, pushToast]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load, revision]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveFullBusinessProfile({ ...form, confirm: false }, workspaceId);
      setProfile(saved);
      pushToast({ title: "Instellingen opgeslagen", message: "Bedrijfsgegevens bijgewerkt.", kind: "success" });
    } catch (err) {
      pushToast({ title: "Opslaan mislukt", message: formatApiError(err, "Controleer de velden."), kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <DashboardHeading title="Webshop" accent="instellingen" subtitle="Beheer je bedrijfsgegevens en workspace-status." />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <Panel>
          <h2 className="text-xl font-black text-navy">Bedrijfsgegevens</h2>
          <p className="mt-1 text-sm text-muted">
            Privé registratiegegevens — niet standaard openbaar. Domein is vergrendeld na eigendomsverificatie.
          </p>
          {loading ? (
            <p className="mt-6 text-sm text-muted">Laden…</p>
          ) : (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["trading_name", "Handelsnaam"],
                    ["legal_name", "Geregistreerde naam"],
                    ["contact_email", "Contact e-mailadres"],
                    ["website_url", "Website"],
                    ["contact_phone", "Telefoonnummer"],
                    ["main_contact_name", "Contactpersoon"],
                    ["kvk_number", "KvK-nummer"],
                    ["vat_number", "BTW-nummer"],
                    ["address_line", "Adres"],
                    ["postal_code", "Postcode"],
                    ["city", "Plaats"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-sm font-bold text-navy">{label}</span>
                    <input
                      value={form[key]}
                      disabled={Boolean(profile?.domain_locked && (key === "website_url"))}
                      onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                      className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-medium text-navy outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:bg-slate-50"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl bg-blue-50/60 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand">
                    <DashboardIcon name="store" size={20} />
                  </span>
                  <div>
                    <p className="font-extrabold text-navy">Webshopstatus</p>
                    <p className="text-xs text-muted">Server-side status voor deze workspace.</p>
                  </div>
                </div>
                <StatusPill status={statusLabel(webshopStatus)} />
              </div>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 font-extrabold text-white hover:bg-brand-dark disabled:opacity-70 sm:w-auto"
              >
                <DashboardIcon name="check" size={18} />
                {saving ? "Opslaan…" : "Wijzigingen opslaan"}
              </button>
            </>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel>
            <h2 className="text-xl font-black text-navy">Team & toegang</h2>
            <p className="mt-1 text-sm text-muted">Nodig medewerkers uit en beheer rollen.</p>
            <Link
              href="/dashboard/team"
              className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-brand hover:underline"
            >
              <DashboardIcon name="users" size={16} />
              Teambeheer openen
            </Link>
          </Panel>
          <Panel className="border-amber-100 bg-amber-50/50">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-amber-600">
                <DashboardIcon name="alert" size={20} />
              </span>
              <div>
                <h3 className="font-black text-navy">Compliance</h3>
                <p className="mt-1 text-sm text-muted">
                  Eigendomsverificatie en merchant-overeenkomst verlopen via de onboarding-flow.
                </p>
                <Link href="/onboarding" className="mt-3 inline-block text-sm font-extrabold text-brand hover:underline">
                  Onboardingstatus bekijken →
                </Link>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
