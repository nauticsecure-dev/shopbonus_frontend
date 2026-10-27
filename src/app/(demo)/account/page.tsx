"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/features/dashboard/components/DashboardIcon";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";
import { useSession, type AccountRole } from "@/features/auth/SessionContext";

function AccountForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { signIn } = useSession();
  const { updateProfile, pushToast } = useShopBonus();
  const [mode, setMode] = useState(params.get("mode") === "login" ? "login" : "register");
  const [role, setRole] = useState<AccountRole>(params.get("role") === "consumer" ? "consumer" : "merchant");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const login = mode === "login";

  function finish(register = false) {
    updateProfile({ email: form.email.trim(), ...(form.name.trim() ? { firstName: form.name.trim(), lastName: "" } : {}) });
    signIn({ role, email: form.email.trim() });
    const destination = params.get("next");
    const safeNext = role === "merchant" && destination && /^\/dashboard(?:\/|$)/.test(destination);
    router.push(register && role === "merchant" ? "/voor-webshops" : safeNext ? destination : role === "merchant" ? "/dashboard" : "/mijn-voordelen");
    pushToast({ title: register ? "Welkom bij ShopBonus!" : "Welkom terug!", message: "Je demosessie is gestart.", kind: "success" });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (verifying) {
      if (code !== "123456") { setError("Gebruik de democode 123456 om je account te bevestigen."); return; }
      finish(true);
    } else if (login) finish();
    else setVerifying(true);
  }

  function changeMode(value: string) {
    setMode(value); setVerifying(false); setError(""); setCode("");
  }

  return (
    <section className="account-page mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[.19em] text-brand">Jouw voordeel begint hier</p>
      <h1 className="max-w-5xl text-[clamp(2rem,4.3vw,3.7rem)] font-extrabold leading-[1.12] tracking-tight text-navy">
        {login ? <>Welkom terug bij <span className="text-brand">ShopBonus.</span></> : <>Maak je <span className="text-brand">ShopBonus-account</span> aan</>}
      </h1>
      <p className="mt-3 text-lg text-muted sm:text-xl">Eén account voor al je voordelen en webshops.</p>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        <div className="surface p-5 sm:p-8">
          <div className="segmented" aria-label="Accountactie">
            {[['register','Account aanmaken'],['login','Inloggen']].map(([value,label]) => <button key={value} onClick={() => changeMode(value)} aria-pressed={mode === value} className={mode === value ? "selected" : ""}>{label}</button>)}
          </div>
          {!verifying && <div className="mt-4 grid grid-cols-2 gap-2" aria-label="Accounttype">
            {([['consumer','Consument','users'],['merchant','Webshop eigenaar','store']] as const).map(([value,label,icon]) => <button key={value} onClick={() => setRole(value)} aria-pressed={role === value} className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-3 text-sm font-bold transition ${role === value ? "border-brand bg-blue-50 text-brand" : "border-blue-100 text-muted hover:bg-blue-50"}`}><Icon name={icon} size={20}/>{label}</button>)}
          </div>}
          <form onSubmit={submit} className="mt-6 space-y-5">
            {verifying ? <>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-brand"><Icon name="check" size={28}/></span>
              <div><h2 className="text-2xl font-extrabold text-navy">Bevestig je e-mailadres</h2><p className="mt-2 text-sm leading-relaxed text-muted">Je maakt een demoaccount aan voor <strong>{form.email}</strong>. Er wordt geen e-mail verstuurd. Gebruik code <strong>123456</strong>.</p></div>
              <label className="field-label" htmlFor="verification">Verificatiecode</label>
              <input id="verification" autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className="form-input text-center text-2xl tracking-[.5em]" placeholder="000000"/>
            </> : <>
              {!login && <div><label className="field-label" htmlFor="name">Voornaam</label><input id="name" autoComplete="given-name" required value={form.name} onChange={e => setForm({...form,name:e.target.value})} className="form-input" placeholder="Hoe mogen we je noemen?"/></div>}
              <div><label className="field-label" htmlFor="email">E-mailadres</label><input id="email" type="email" autoComplete="email" required value={form.email} onChange={e => setForm({...form,email:e.target.value})} className="form-input" placeholder="jij@voorbeeld.nl"/></div>
              <div><label className="field-label" htmlFor="password">Wachtwoord</label><div className="relative"><input id="password" type={showPassword ? "text" : "password"} autoComplete={login ? "current-password" : "new-password"} minLength={8} required value={form.password} onChange={e => setForm({...form,password:e.target.value})} className="form-input pr-14" placeholder="Minimaal 8 tekens"/><button type="button" aria-label={showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted"><Icon name="eye" size={21}/></button></div></div>
              {!login && <label className="flex items-start gap-3 text-sm leading-relaxed text-muted"><input required type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-blue-600"/>Ik begrijp dat dit een demo is en mijn gegevens alleen in deze browser worden bewaard.</label>}
            </>}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" className="primary-button w-full">{verifying ? "Bevestigen en verder" : login ? "Inloggen" : "Account aanmaken"}<Icon name="arrow" size={20}/></button>
            <p className="text-center text-sm text-muted">{login ? "Nog geen account?" : "Al een account?"} <button type="button" onClick={() => changeMode(login ? "register" : "login")} className="font-bold text-brand hover:underline">{login ? "Account aanmaken" : "Inloggen"}</button></p>
          </form>
          <p className="mt-6 border-t border-blue-50 pt-4 text-center text-xs leading-relaxed text-muted">Demo-omgeving · Gebruik een voorbeeldadres en een fictief wachtwoord van 8 tekens. Je wachtwoord wordt niet opgeslagen.</p>
        </div>
        <aside className="space-y-5">
          <div className="account-benefits relative overflow-hidden rounded-3xl border border-white p-6 sm:p-9">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-brand"><Icon name="check" size={14}/> Gratis en eenvoudig</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-navy">In <span className="text-brand">2 minuten</span> gestart</h2>
            <p className="mt-3 max-w-sm leading-relaxed text-muted">{role === "merchant" ? "Geef je webshop een vliegende start. Bereik nieuwe klanten met aanbiedingen die jij bepaalt." : "Shop bij je favoriete webshops en haal meer uit iedere aankoop."}</p>
            <ul className="my-7 space-y-4">{(role === "merchant" ? ["Maak je gratis account aan", "Vul je webshopgegevens in", "Activeer je eerste aanbieding"] : ["Maak je gratis account aan", "Ontdek jouw favoriete webshops", "Ontgrendel exclusieve vouchers"]).map(t => <li key={t} className="flex items-center gap-3 text-sm font-semibold text-navy"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-brand"><Icon name="check" size={16}/></span>{t}</li>)}</ul>
            <div aria-hidden="true" className="relative mx-auto my-8 flex h-40 max-w-xs items-center justify-center"><div className="absolute h-40 w-40 rounded-full bg-white/60"/><div className="relative -rotate-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 px-8 py-6 text-white shadow-xl shadow-blue-500/20"><Icon name="wallet" size={36}/><p className="mt-4 text-xs text-blue-100">Jouw ShopBonus-tegoed</p><p className="mt-1 text-3xl font-extrabold">Meer voordeel.</p></div><span className="absolute -right-1 top-0 rotate-12 rounded-2xl border-4 border-white bg-blue-500 p-4 text-3xl font-extrabold text-white shadow-lg">%</span></div>
            <ol className="mt-9 grid grid-cols-3 gap-2 border-t border-blue-200/60 pt-5">{["Account",role === "merchant" ? "Webshop" : "Ontdekken",role === "merchant" ? "Aanbieding" : "Voordeel"].map((label,i) => <li key={label} className="flex flex-col items-center gap-2 text-xs font-semibold text-muted"><span className={`grid h-9 w-9 place-items-center rounded-full ${i === 0 ? "bg-brand text-white ring-4 ring-blue-200" : "bg-white/70 text-muted"}`}>{i+1}</span>{label}</li>)}</ol>
          </div>
          <Link href="/webshops" className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-muted hover:text-brand">Liever eerst rondkijken? Ontdek de webshops <Icon name="arrow" size={16}/></Link>
        </aside>
      </div>
    </section>
  );
}

export default function AccountPage() {
  return <Suspense fallback={<div className="p-12 text-center text-muted">Account laden…</div>}><AccountForm/></Suspense>;
}
