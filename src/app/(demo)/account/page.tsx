"use client";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, mutate } from "@/lib/api";
import { useSession } from "@/features/auth/SessionContext";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";
import { Panel, ErrorNotice, Button, Field } from "@/features/live/LivePages";
type Legal = {
    terms: {
        version: string;
        slug: string;
    };
    privacy: {
        version: string;
        slug: string;
    };
};
function AccountForm() {
    const params = useSearchParams(), router = useRouter();
    const { session, refresh } = useSession();
    const { pushToast } = useShopBonus();
    const [mode, setMode] = useState(params.get("mode") === "login" ? "login" : "register");
    const [form, setForm] = useState({ first_name: "", email: "", password: "", password_confirmation: "", account_type: "consumer", code: "", accept_terms: false });
    const [error, setError] = useState(""), [busy, setBusy] = useState(false), [twoFactor, setTwoFactor] = useState(false);
    const [legal, setLegal] = useState<Legal | null>(null), [legalError, setLegalError] = useState("");
    const verify = !!session && !session.email_verified;
    useEffect(() => {
        if (mode !== "register")
            return;
        let active = true;
        (async () => {
            try {
                const index = await api<{
                    data: {
                        key: string;
                        type: string;
                        slug: string;
                    }[];
                }>("public/pages?locale=nl");
                const terms = index.data.find(p => p.type === "terms"), privacy = index.data.find(p => p.type === "privacy");
                if (!terms || !privacy)
                    throw new Error("Registratie is nog niet beschikbaar: de voorwaarden en privacyverklaring zijn niet gepubliceerd.");
                const [t, p] = await Promise.all([api<{
                        data: {
                            legal: {
                                version: string;
                            } | null;
                        };
                    }>("public/pages/nl/" + terms.slug), api<{
                        data: {
                            legal: {
                                version: string;
                            } | null;
                        };
                    }>("public/pages/nl/" + privacy.slug)]);
                if (!t.data.legal?.version || !p.data.legal?.version)
                    throw new Error("De juridische documentversies zijn niet beschikbaar.");
                if (active)
                    setLegal({ terms: { version: t.data.legal.version, slug: terms.slug }, privacy: { version: p.data.legal.version, slug: privacy.slug } });
            }
            catch (e) {
                if (active)
                    setLegalError(e instanceof Error ? e.message : "Voorwaarden laden mislukt.");
            }
        })();
        return () => { active = false; };
    }, [mode]);
    async function submit(event: FormEvent) {
        event.preventDefault();
        if (busy)
            return;
        setBusy(true);
        setError("");
        try {
            if (verify)
                await mutate("auth/email/verify-code", { code: form.code });
            else if (twoFactor)
                await mutate("/two-factor-challenge", { code: form.code });
            else if (mode === "forgot") {
                await mutate("/forgot-password", { email: form.email });
                pushToast({ title: "Aanvraag ontvangen", message: "Controleer je e-mail voor verdere instructies.", kind: "info" });
                return;
            }
            else if (mode === "login") {
                const result = await mutate<{
                    two_factor?: boolean;
                }>("/login", { email: form.email, password: form.password });
                if (result.two_factor) {
                    setTwoFactor(true);
                    return;
                }
            }
            else {
                if (!legal)
                    throw new Error(legalError || "De voorwaarden worden geladen.");
                await mutate("/register", { ...form, terms_version: legal.terms.version, privacy_version: legal.privacy.version, locale: "nl" });
            }
            const identity = await refresh();
            if (!identity)
                throw new Error("Je sessie kon niet worden geladen.");
            if (!identity.email_verified)
                return;
            const next = params.get("next");
            if (next && /^\/(claim|checkout)\/[A-Za-z0-9-]+$/.test(next)) {
                router.push(next);
                return;
            }
            router.push(identity.roles.includes("super_admin") ? "/admin" : identity.workspaces.length ? "/dashboard" : identity.onboarding_intent === "merchant" ? "/voor-webshops" : "/mijn-voordelen");
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Aanvraag mislukt.");
        }
        finally {
            setBusy(false);
        }
    }
    return <div className="mx-auto max-w-xl px-4 py-12"><h1 className="mb-7 text-4xl font-black text-navy">{verify ? "Bevestig je e-mail" : twoFactor ? "Tweestapsverificatie" : mode === "login" ? "Welkom terug" : mode === "forgot" ? "Wachtwoord vergeten" : "Maak je account aan"}</h1><Panel>
 <form onSubmit={submit} className="space-y-5">
 {verify || twoFactor ? <><p>{verify ? "Vul de code in die naar je e-mailadres is verstuurd." : "Vul de code uit je authenticator-app in."}</p><Field label="Verificatiecode" name="code" value={form.code} onChange={v => setForm({ ...form, code: v })} required/>
 {verify && <Button type="button" onClick={async () => { try {
            await mutate("auth/email/resend-code");
            pushToast({ title: "Code verstuurd", message: "Controleer je e-mail.", kind: "info" });
        }
        catch (e) {
            setError(String(e instanceof Error ? e.message : e));
        } }}>Nieuwe code versturen</Button>}</> : <>
 {mode === "register" && <><Field label="Voornaam" name="first_name" value={form.first_name} onChange={v => setForm({ ...form, first_name: v })} required/><label className="field-label">Accounttype<select className="form-input" value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })}><option value="consumer">Consument</option><option value="merchant">Webshop eigenaar</option></select></label></>}
 <Field label="E-mailadres" name="email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required/>
 {mode !== "forgot" && <Field label="Wachtwoord" name="password" type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} required/>}
 {mode === "register" && <><Field label="Bevestig wachtwoord" name="password_confirmation" type="password" value={form.password_confirmation} onChange={v => setForm({ ...form, password_confirmation: v })} required/>{legal ? <label className="flex items-start gap-3 text-sm"><input type="checkbox" required checked={form.accept_terms} onChange={e => setForm({ ...form, accept_terms: e.target.checked })}/><span>Ik accepteer de <Link className="text-brand underline" href={"/informatie/" + legal.terms.slug} target="_blank">voorwaarden (versie {legal.terms.version})</Link> en de <Link className="text-brand underline" href={"/informatie/" + legal.privacy.slug} target="_blank">privacyverklaring (versie {legal.privacy.version})</Link>.</span></label> : <ErrorNotice message={legalError || "Voorwaarden laden…"}/>}</>}
 </>}
 <ErrorNotice message={error}/><Button disabled={busy || (!verify && !twoFactor && mode === "register" && !legal)}>{busy ? "Even geduld…" : verify || twoFactor ? "Bevestigen" : mode === "login" ? "Inloggen" : mode === "forgot" ? "Herstellink aanvragen" : "Account aanmaken"}</Button>
 </form>{!verify && !twoFactor && <div className="mt-6 flex flex-wrap gap-5 text-sm text-brand">{["login", "register", "forgot"].filter(m => m !== mode).map(m => <button key={m} onClick={() => { setMode(m); setError(""); }}>{m === "login" ? "Inloggen" : m === "register" ? "Account aanmaken" : "Wachtwoord vergeten"}</button>)}</div>}
 </Panel></div>;
}
export default function AccountPage() { return <Suspense fallback={<p className="p-10">Laden…</p>}><AccountForm /></Suspense>; }
