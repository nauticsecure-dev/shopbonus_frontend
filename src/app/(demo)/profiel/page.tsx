"use client";

import { useState } from "react";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";

export default function ProfielPage() {
  const { profile, updateProfile, pushToast } = useShopBonus();
  const [form, setForm] = useState({
    firstName: profile.firstName,
    email: profile.email,
    phone: profile.phone,
  });
  const [saving, setSaving] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", repeat: "" });

  const save = () => {
    if (!form.firstName.trim() || !form.email.trim()) {
      pushToast({ title: "Controleer je gegevens", message: "Voornaam en e-mailadres zijn verplicht.", kind: "error" });
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      updateProfile({ firstName: form.firstName.trim(), email: form.email.trim(), phone: form.phone.trim() });
      setSaving(false);
      pushToast({ title: "Wijzigingen opgeslagen", message: "Je profiel is bijgewerkt.", kind: "success" });
    }, 700);
  };

  const toggleNotif = (key: "vouchers" | "reminders" | "inspiration") => {
    updateProfile({
      notifications: { ...profile.notifications, [key]: !profile.notifications[key] },
    });
  };

  const changePassword = () => {
    if (!pw.current || !pw.next || pw.next !== pw.repeat) {
      pushToast({ title: "Wachtwoord niet gewijzigd", message: "Controleer je invoer: de nieuwe wachtwoorden komen niet overeen.", kind: "error" });
      return;
    }
    if (pw.next.length < 8) {
      pushToast({ title: "Te kort wachtwoord", message: "Kies een wachtwoord van minimaal 8 tekens.", kind: "error" });
      return;
    }
    setShowPwModal(false);
    setPw({ current: "", next: "", repeat: "" });
    pushToast({ title: "Wachtwoord gewijzigd", message: "Je gebruikt vanaf nu je nieuwe wachtwoord.", kind: "success" });
  };

  return (
    <div className="relative overflow-hidden">
      <div className="page-blob left-[-100px] top-[-60px] h-80 w-80 bg-blue-200/50" />
      <div className="page-blob right-[-160px] top-[140px] h-[28rem] w-[28rem] bg-sky-100" />

      <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-[clamp(2.6rem,6vw,4.2rem)] font-black leading-none tracking-tight">
          <span className="text-navy">Mijn</span> <span className="text-brand">profiel</span>
        </h1>
        <p className="mt-3 text-lg text-muted">Beheer je gegevens en accountinstellingen.</p>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-5">
          {/* Personal data */}
          <div className="rounded-[1.75rem] bg-white p-7 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.2)] sm:p-8 lg:col-span-3">
            <h2 className="text-2xl font-black text-navy">Persoonlijke gegevens</h2>
            <p className="mt-1 text-muted">Hier kun je je persoonlijke gegevens beheren.</p>

            <div className="mt-6 flex items-center gap-5">
              <div className="relative">
                <span className="grid h-24 w-24 place-items-center rounded-full bg-brand-light text-5xl font-black text-navy">
                  {form.firstName.charAt(0).toUpperCase() || "S"}
                </span>
                <button
                  onClick={() => pushToast({ title: "Profielfoto (demo)", message: "Uploaden van een foto is uitgeschakeld in deze demo.", kind: "info" })}
                  className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-white text-brand shadow-lg"
                  aria-label="Profielfoto wijzigen"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
              </div>
              <div>
                <p className="text-2xl font-black text-navy">
                  {form.firstName} {profile.lastName}
                </p>
                <button
                  onClick={() => pushToast({ title: "Profielfoto (demo)", message: "Uploaden van een foto is uitgeschakeld in deze demo.", kind: "info" })}
                  className="font-semibold text-brand underline underline-offset-2 hover:text-brand-dark"
                >
                  Profielfoto wijzigen
                </button>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              <div>
                <label className="mb-1.5 block font-bold text-navy">Voornaam</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full rounded-2xl border border-blue-100 bg-white px-5 py-3.5 font-medium text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-bold text-navy">E-mailadres</label>
                <div className="relative">
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    type="email"
                    className="w-full rounded-2xl border border-blue-100 bg-white py-3.5 pl-5 pr-40 font-medium text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                  <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-mint px-3.5 py-1.5 text-sm font-extrabold text-green-700">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="m8 12.5 2.7 2.7L16 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Geverifieerd
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-bold text-navy">
                  Telefoonnummer <span className="font-medium text-muted">(optioneel)</span>
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Bijv. 06 12345678"
                  className="w-full rounded-2xl border border-blue-100 bg-white px-5 py-3.5 font-medium text-navy placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-[16px] font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.7)] transition hover:bg-brand-dark disabled:opacity-70"
              >
                {saving && <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />}
                {saving ? "Opslaan…" : "Wijzigingen opslaan"}
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-[1.75rem] bg-white p-7 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.2)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-navy">Accountbeveiliging</h2>
                  <p className="mt-1 text-muted">Je account is goed beveiligd.</p>
                </div>
                <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-green-100 text-green-700">
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor" opacity="0.9" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2.4" />
                    <circle cx="12" cy="15" r="1.5" fill="white" />
                  </svg>
                </span>
              </div>
              <div className="mt-5 space-y-3">
                <button
                  onClick={() => setShowPwModal(true)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-blue-50 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-light text-brand">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="15" r="4.5" stroke="currentColor" strokeWidth="2.2" /><path d="m11.5 11.5 8-8M17 5l2.5 2.5M14.5 7.5 17 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  </span>
                  <span className="flex-1">
                    <span className="block font-extrabold text-navy">Wachtwoord wijzigen</span>
                    <span className="block text-sm text-muted">Kies een nieuw en veilig wachtwoord.</span>
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-navy"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button
                  onClick={() => pushToast({ title: "E-mailverificatie actief", message: "Je e-mailadres is al geverifieerd. Top!", kind: "success" })}
                  className="flex w-full items-center gap-4 rounded-2xl border border-blue-50 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-light text-brand">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="2.2" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span className="flex-1">
                    <span className="block font-extrabold text-navy">E-mailverificatie actief</span>
                    <span className="block text-sm text-muted">Je e-mailadres is geverifieerd.</span>
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-navy"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white p-7 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.2)]">
              <h2 className="text-2xl font-black text-navy">E-mailmeldingen</h2>
              <p className="mt-1 text-muted">Ontvang alleen de updates die je interessant vindt.</p>
              <div className="mt-5 space-y-5">
                {([
                  ["vouchers", "Vouchers en kortingen", "Ontvang nieuwe vouchers en exclusieve deals."],
                  ["reminders", "Herinneringen", "Krijg meldingen over aflopende vouchers."],
                  ["inspiration", "Aanbiedingen en inspiratie", "Ontvang de beste shops, acties en onmisbare deals."],
                ] as const).map(([key, title, desc]) => {
                  const on = profile.notifications[key];
                  return (
                    <button key={key} onClick={() => toggleNotif(key)} className="flex w-full items-start gap-3.5 text-left">
                      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg transition ${on ? "bg-brand text-white" : "border-2 border-slate-200 bg-white text-transparent"}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      <span>
                        <span className="block font-extrabold text-navy">{title}</span>
                        <span className="block text-[15px] text-muted">{desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Password modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm" onClick={() => setShowPwModal(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-navy">Wachtwoord wijzigen</h3>
            <p className="mt-1 text-sm text-muted">Kies een nieuw en veilig wachtwoord van minimaal 8 tekens.</p>
            <div className="mt-5 space-y-3">
              {([["current", "Huidig wachtwoord"], ["next", "Nieuw wachtwoord"], ["repeat", "Herhaal nieuw wachtwoord"]] as const).map(([k, label]) => (
                <div key={k}>
                  <label className="mb-1 block text-sm font-bold text-navy">{label}</label>
                  <input
                    type="password"
                    value={pw[k]}
                    onChange={(e) => setPw({ ...pw, [k]: e.target.value })}
                    className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy focus:border-brand focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowPwModal(false)} className="flex-1 rounded-2xl bg-slate-100 py-3.5 font-extrabold text-navy hover:bg-slate-200">
                Annuleren
              </button>
              <button onClick={changePassword} className="flex-1 rounded-2xl bg-brand py-3.5 font-extrabold text-white hover:bg-brand-dark">
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
