"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode, type FormEvent, type ButtonHTMLAttributes } from "react";
import { api, apiPath, mutate, ApiError } from "@/lib/api";
import { useSession } from "@/features/auth/SessionContext";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";
import SessionGate from "@/features/auth/components/SessionGate";
type Value = string | number | boolean | null | Value[] | {
    [key: string]: Value;
};
type Row = {
    [key: string]: Value;
};
type Envelope<T> = {
    data: T;
    meta?: {
        current_page: number;
        last_page: number;
        total: number;
    };
};
const euro = (minor: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(minor / 100);
const message = (e: unknown) => e instanceof ApiError ? e.message + (e.requestId ? " (Referentie: " + e.requestId + ")" : "") : e instanceof Error ? e.message : "Aanvraag mislukt.";
export function Panel({ children, title }: {
    children: ReactNode;
    title?: string;
}) { return <section className="surface my-5 overflow-hidden p-5 sm:p-7">{title && <h2 className="mb-5 text-xl font-extrabold text-navy">{title}</h2>}{children}</section>; }
export function Page({ title, children }: {
    title: string;
    children: ReactNode;
}) { return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><h1 className="mb-7 text-3xl font-black text-navy sm:text-4xl">{title}</h1>{children}</div>; }
export function ErrorNotice({ message: msg }: {
    message?: string;
}) { return msg ? <p role="alert" className="my-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{msg}</p> : null; }
export function Button({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button type="submit" {...props} className={"primary-button disabled:cursor-wait disabled:opacity-50 " + (props.className || "")}>{children}</button>; }
export function Field({ label, name, value, onChange, type = "text", required = false }: {
    label: string;
    name: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    required?: boolean;
}) { return <label className="field-label block">{label}<input name={name} className="form-input mt-2" type={type} value={value} step={type === "number" ? "any" : undefined} onChange={e => onChange(e.target.value)} required={required}/></label>; }
function useResource<T>(path: string | null) {
    const { session } = useSession();
    const owner = session?.id || "guest";
    const key = owner + ":" + path;
    const [state, setState] = useState<{
        key: string;
        payload?: Envelope<T>;
        error?: string;
    }>({ key: "" });
    const [revision, setRevision] = useState(0);
    const reload = useCallback(() => setRevision(n => n + 1), []);
    useEffect(() => { if (!path)
        return; let active = true; api<Envelope<T>>(path).then(payload => { if (active)
        setState({ key, payload }); }).catch(e => { if (active)
        setState({ key, error: message(e) }); }); return () => { active = false; }; }, [path, key, revision]);
    return { payload: state.key === key ? state.payload : undefined, error: state.key === key ? state.error : undefined, loading: !!path && state.key !== key, reload };
}
const labels: Record<string, string> = { name: "Naam", title: "Titel", status: "Status", summary: "Omschrijving", first_name: "Voornaam", email: "E-mail", phone: "Telefoon", created_at: "Aangemaakt", issued_at: "Uitgegeven", expires_at: "Geldig tot", redeemed_at: "Ingewisseld", description: "Omschrijving", available: "Beschikbaar", pending: "In behandeling", reserved: "Gereserveerd", unit: "Eenheid", amount: "Bedrag", type: "Type", webshop: "Webshop", code_masked: "Code", kpis: "Resultaten", funding: "Financiering", totals: "Totalen", notifications: "Meldingen", latest: "Recent", unread: "Ongelezen", period: "Periode", currency: "Valuta", withdrawable: "Opneembaar", notice: "Toelichting", state: "Status", version: "Versie", body: "Overeenkomst", signatory_name: "Ondertekenaar", terms: "Voorwaarden", terms_version: "Versie voorwaarden", discount_type: "Kortingsvorm", discount_value: "Korting", min_order_minor: "Minimale bestelling", price_minor: "Prijs", available_minor: "Beschikbaar tegoed", reserved_minor: "Gereserveerd tegoed", payment_part_minor: "Online betaling", wallet_part_minor: "ShopBonus-tegoed", missing_for_activation: "Nog nodig voor activering", read_at: "Gelezen op", message: "Bericht" };
function DataView({ value, field = "", unit = "" }: {
    value: Value | undefined;
    field?: string;
    unit?: string;
}) {
    if (value === null || value === undefined)
        return <span className="text-muted">—</span>;
    if (typeof value === "boolean")
        return <span>{value ? "Ja" : "Nee"}</span>;
    if (typeof value === "number")
        return <span>{field.endsWith("_minor") || (unit === "eur_credit" && ["available", "pending", "reserved", "amount", "available_after", "total_earned", "total_spent", "total_expired"].includes(field)) ? euro(value) : value.toLocaleString("nl-NL")}</span>;
    if (typeof value === "string")
        return <span className="whitespace-pre-wrap break-words">{({ active: "Actief", draft: "Concept", paused: "Gepauzeerd", ended: "Beëindigd", pending_payment: "Wacht op betaling", completed: "Voltooid", failed: "Mislukt", expired: "Verlopen", issued: "Uitgegeven", redeemed: "Ingewisseld", available: "Beschikbaar", eur_credit: "ShopBonus-tegoed", points: "Punten", merchant_reward: "Beloning na aankoop", wallet_purchase: "Voucher kopen", promotional_code: "Promotiecode", earn_with_purchase: "Verdienen na aankoop", buy_with_wallet: "Kopen met tegoed", claim: "Via persoonlijke claimlink", percentage: "Percentage", fixed: "Vast bedrag" } as Record<string, string>)[value] || value}</span>;
    if (Array.isArray(value))
        return value.length ? <div className="space-y-3">{value.map((v, i) => <div key={i} className="rounded-xl bg-blue-50/50 p-3"><DataView value={v}/></div>)}</div> : <p className="text-muted">Nog geen gegevens.</p>;
    return <dl className="grid gap-4 sm:grid-cols-2">{Object.entries(value).filter(([k]) => !["id", "document_hash", "generated_at", "definitions", "request_id", "checkout_url", "logo_url", "avatar_url"].includes(k)).map(([k, v]) => <div key={k}><dt className="mb-1 text-xs font-bold text-muted">{labels[k] || ({ how_to_obtain: "Zo werkt het", availability: "Beschikbaarheid", wallet_available: "Beschikbaar ShopBonus-tegoed", blockers: "Nog nodig voor aankoop", acquisition: "Soort aanbieding", redemption_validity_days: "Geldigheid in dagen", public_description: "Beschrijving", total_earned: "Totaal verdiend", total_spent: "Totaal besteed", total_expired: "Totaal verlopen", balances: "Tegoed", eur_credit: "ShopBonus-tegoed", points: "Punten", email_verified: "E-mailadres bevestigd", security: "Beveiliging", code: "Jouw code", instructions: "Gebruiksinstructies", purchase: "Aankoop", redemption: "Inwisseling", website_url: "Website", expires_soon: "Verloopt binnenkort", legal_name: "Juridische naam", trading_name: "Handelsnaam", confirmed: "Bevestigd", missing_fields: "Nog invullen" } as Record<string, string>)[k] || k.replaceAll("_", " ")}</dt><dd className="text-sm text-navy"><DataView value={k === "discount_value" && typeof v === "number" ? (value.discount_type === "percentage" ? (v / 100) + "%" : euro(v)) : v} field={k} unit={typeof value.unit === "string" ? value.unit : unit}/></dd></div>)}</dl>;
}
function ResourcePanel({ path, title }: {
    path: string | null;
    title: string;
}) {
    const r = useResource<Value>(path);
    return <Panel title={title}><ErrorNotice message={r.error}/>{r.loading ? <p role="status">Gegevens laden…</p> : r.payload ? <DataView value={r.payload.data}/> : null}<button type="button" className="mt-5 text-sm font-bold text-brand" onClick={r.reload}>Vernieuwen ↻</button></Panel>;
}
type FormField = {
    name: string;
    label: string;
    type?: string;
    options?: [
        string,
        string
    ][];
    optional?: boolean;
};
function ActionForm({ title, fields, initial = {}, submitLabel = "Opslaan", submit, onSuccess }: {
    title: string;
    fields: FormField[];
    initial?: Record<string, string>;
    submitLabel?: string;
    submit: (values: Record<string, string>) => Promise<unknown>;
    onSuccess?: () => void;
}) {
    const [values, setValues] = useState(initial), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const { pushToast } = useShopBonus();
    async function save(event: FormEvent) { event.preventDefault(); if (busy)
        return; setBusy(true); setError(""); try {
        await submit(values);
        pushToast({ title: "Opgeslagen", message: "De aanvraag is verwerkt.", kind: "success" });
        onSuccess?.();
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }
    return <Panel title={title}><form onSubmit={save} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">{fields.map(f => <div key={f.name}>{f.options ? <label className="field-label">{f.label}<select className="form-input mt-2" required={!f.optional} value={values[f.name] || ""} onChange={e => setValues({ ...values, [f.name]: e.target.value })}><option value="">Kies…</option>{f.options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label> : f.type === "textarea" ? <label className="field-label">{f.label}<textarea className="form-input mt-2" rows={5} required={!f.optional} value={values[f.name] || ""} onChange={e => setValues({ ...values, [f.name]: e.target.value })}/></label> : <Field {...f} type={f.type} value={values[f.name] || ""} onChange={v => setValues({ ...values, [f.name]: v })} required={!f.optional}/>}</div>)}</div><ErrorNotice message={error}/><Button disabled={busy}>{busy ? "Bezig…" : submitLabel}</Button></form></Panel>;
}
export function MerchantLayout({ children }: {
    children: ReactNode;
}) {
    const { session, refresh, signOut, error } = useSession();
    const { pushToast } = useShopBonus();
    const [busy, setBusy] = useState(false);
    const current = session?.workspaces.find(w => w.is_current) || session?.workspaces[0];
    async function select(id: string) { setBusy(true); try {
        await mutate("workspaces/" + id + "/select");
        await refresh();
    }
    catch (e) {
        pushToast({ title: "Webshop wisselen mislukt", message: message(e), kind: "error" });
    }
    finally {
        setBusy(false);
    } }
    return <><nav aria-label="Webshop dashboard" className="flex flex-wrap items-center gap-4 border-b border-blue-100 bg-white px-5 py-5"><Link className="text-xl font-black text-brand" href="/">ShopBonus</Link>{[["/dashboard", "Overzicht"], ["/dashboard/offers", "Aanbiedingen"], ["/dashboard/analytics", "Statistieken"], ["/dashboard/notifications", "Meldingen"], ["/dashboard/settings", "Instellingen"], ["/voor-webshops", "Webshop aanmelden"]].map(([href, label]) => <Link key={href} className="text-sm font-bold text-navy hover:text-brand" href={href}>{label}</Link>)}<select aria-label="Actieve webshop" className="rounded-xl border border-blue-100 p-2" disabled={busy} value={current?.id || ""} onChange={e => void select(e.target.value)}>{!current && <option value="">Geen webshop</option>}{session?.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select><button className="text-sm text-brand" onClick={() => void signOut().catch(e => pushToast({ title: "Uitloggen mislukt", message: message(e), kind: "error" }))}>Uitloggen</button></nav><ErrorNotice message={error}/>{current ? <div key={current.id}>{children}</div> : <Page title="Je eerste webshop"><Link className="primary-button" href="/voor-webshops">Webshop aanmelden →</Link></Page>}</>;
}
function useWorkspace() { const { session } = useSession(); const w = session?.workspaces.find(w => w.is_current) || session?.workspaces[0]; return w ? "workspaces/" + w.id : null; }
type PublicOffer = {
    slug: string;
    title: string;
    summary: string;
    price_minor: number | null;
    how_to_obtain: string;
    availability: string;
    webshop: {
        slug: string;
        name: string;
    };
};
type PublicShop = {
    slug: string;
    name: string;
    short_description: string;
    description?: string;
    offers?: PublicOffer[];
    featured_offer?: PublicOffer;
};
type Category = {
    key: string;
    label: {
        nl: string;
        en: string;
    };
};
function Pager({ page, last, onChange }: {
    page: number;
    last: number;
    onChange: (n: number) => void;
}) { return <div className="my-5 flex items-center gap-5"><button disabled={page <= 1} className="text-brand disabled:text-muted" onClick={() => onChange(page - 1)}>← Vorige</button><span>{page} / {last}</span><button disabled={page >= last} className="text-brand disabled:text-muted" onClick={() => onChange(page + 1)}>Volgende →</button></div>; }
export function CatalogPage({ offers = false, home = false }: {
    offers?: boolean;
    home?: boolean;
}) {
    const [search, setSearch] = useState(""), [query, setQuery] = useState(""), [category, setCategory] = useState(""), [page, setPage] = useState(1);
    const cats = useResource<Category[]>("public/categories");
    const path = "public/" + (offers ? "offers" : "webshops") + "?" + new URLSearchParams({ search: query, category, page: String(page), sort: offers ? "newest" : "name" });
    const r = useResource<(PublicShop & PublicOffer)[]>(path);
    return <Page title={home ? "Meer voordeel bij jouw favoriete webshops" : offers ? "Aanbiedingen & kortingsvouchers" : "Ontdek webshops"}>
 {home && <div className="mb-8 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white"><h2 className="text-3xl font-black">Shop slim. Spaar voordeel.</h2><p className="my-4 max-w-xl">Ontdek aanbiedingen, beheer je ShopBonus-tegoed en bekijk je vouchers in één account.</p><Link className="inline-block rounded-xl bg-white px-5 py-3 font-bold text-brand" href="/account">Gratis account aanmaken →</Link></div>}
 <form className="flex flex-wrap gap-4" onSubmit={e => { e.preventDefault(); setQuery(search); setPage(1); }}><input aria-label="Zoeken" placeholder="Zoek een webshop of aanbieding" className="form-input max-w-md" value={search} onChange={e => setSearch(e.target.value)}/><select aria-label="Categorie" className="form-input max-w-xs" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}><option value="">Alle categorieën</option>{cats.payload?.data.map(c => <option key={c.key} value={c.key}>{c.label.nl}</option>)}</select><Button>Zoeken</Button></form>
 <ErrorNotice message={r.error}/>{r.loading && <p className="my-8" role="status">Aanbod laden…</p>}
 {r.payload?.data.length === 0 && <Panel><p>Er zijn nog geen gepubliceerde {offers ? "aanbiedingen" : "webshops"} gevonden.</p></Panel>}
 <div className="grid gap-5 py-6 md:grid-cols-2 lg:grid-cols-3">{r.payload?.data.map(item => <Panel key={item.slug}><p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-brand">{offers ? item.webshop?.name : "ShopBonus webshop"}</p><h2 className="text-xl font-black text-navy">{offers ? item.title : item.name}</h2><p className="my-3 text-muted">{offers ? item.summary : item.short_description}</p><Link className="font-bold text-brand" href={offers ? "/aanbiedingen/" + item.slug : "/webshops/" + item.slug}>Bekijk {offers ? "aanbieding" : "webshop"} →</Link></Panel>)}</div>
 {r.payload?.meta && <Pager page={page} last={r.payload.meta.last_page} onChange={setPage}/>}
 </Page>;
}
export function ShopDetail({ slug }: {
    slug: string;
}) {
    const r = useResource<PublicShop>("public/webshops/" + encodeURIComponent(slug));
    const { session } = useSession();
    const { pushToast } = useShopBonus();
    return <Page title={r.payload?.data.name || "Webshop"}><ErrorNotice message={r.error}/>{r.loading && <p>Laden…</p>}{r.payload && <><Panel><p className="mb-5 whitespace-pre-wrap text-muted">{r.payload.data.description || r.payload.data.short_description}</p><a className="primary-button" href={apiPath("public/webshops/" + encodeURIComponent(slug) + "/visit")}>Bezoek webshop →</a>{session && <button className="ml-5 font-bold text-brand" onClick={async () => { try {
        await mutate("consumer/favorites/" + encodeURIComponent(slug), {}, "PUT");
        pushToast({ title: "Favoriet toegevoegd", message: "De webshop is opgeslagen.", kind: "success" });
    }
    catch (e) {
        pushToast({ title: "Opslaan mislukt", message: message(e), kind: "error" });
    } }}>Bewaar als favoriet</button>}</Panel><h2 className="my-5 text-2xl font-black">Aanbiedingen</h2>{r.payload.data.offers?.length ? r.payload.data.offers.map(o => <Panel key={o.slug}><h3 className="text-xl font-bold">{o.title}</h3><p className="my-3">{o.summary}</p><Link className="text-brand" href={"/aanbiedingen/" + o.slug}>Bekijk voorwaarden →</Link></Panel>) : <p>Deze webshop heeft nog geen gepubliceerde aanbiedingen.</p>}</>}</Page>;
}
type Checkout = {
    id: string;
    state: string;
    price_minor: number;
    wallet_part_minor: number;
    payment_part_minor: number;
    voucher_id: string | null;
    payment: {
        checkout_url: string | null;
    } | null;
    failure_reason: string | null;
};
export function OfferDetail({ slug }: {
    slug: string;
}) {
    const r = useResource<PublicOffer & Row>("public/offers/" + encodeURIComponent(slug));
    const { session, refresh } = useSession();
    const [quote, setQuote] = useState<Row | null>(null), [checkout, setCheckout] = useState<Checkout | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const key = useRef<string | null>(null);
    const [useWallet, setUseWallet] = useState(true);
    async function getQuote() { setBusy(true); setError(""); try {
        setQuote((await mutate<Envelope<Row>>("consumer/checkouts/quote", { offer: slug, use_wallet: useWallet })).data);
        setCheckout(null);
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }
    async function buy() { if (busy)
        return; setBusy(true); setError(""); try {
        if (!key.current) {
            try {
                key.current = sessionStorage.getItem("checkout-key:" + session?.id + ":" + slug + ":" + useWallet) || crypto.randomUUID();
                sessionStorage.setItem("checkout-key:" + session?.id + ":" + slug + ":" + useWallet, key.current);
            }
            catch {
                key.current = crypto.randomUUID();
            }
        }
        setCheckout((await mutate<Envelope<Checkout>>("consumer/checkouts", { offer: slug, use_wallet: useWallet }, "POST", { "Idempotency-Key": key.current })).data);
        await refresh();
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }
    return <Page title={r.payload?.data.title || "Aanbieding"}><ErrorNotice message={r.error}/>{r.payload && <><Panel><DataView value={r.payload.data}/></Panel><ErrorNotice message={error}/>{!session ? <Link className="primary-button" href="/account?mode=login">Log in om verder te gaan</Link> : r.payload.data.how_to_obtain === "buy_with_wallet" ? <Panel title="Voucher kopen"><label className="flex gap-3"><input type="checkbox" checked={useWallet} disabled={!!checkout || busy} onChange={e => { setUseWallet(e.target.checked); setQuote(null); key.current = null; }}/>Gebruik mijn ShopBonus-tegoed</label><Button type="button" disabled={busy || !!checkout} onClick={() => void getQuote()}>Prijs berekenen</Button>{quote && <><div className="my-5"><DataView value={quote}/></div><Button disabled={busy || !!checkout || Boolean((quote.blockers as Value[] | undefined)?.length)} onClick={() => void buy()}>Aankoop bevestigen</Button></>}{checkout && <div className="mt-5"><DataView value={checkout as unknown as Row}/>{checkout.payment?.checkout_url && <a className="primary-button my-4" href={checkout.payment.checkout_url}>Ga naar beveiligde betaling →</a>}{checkout.state === "completed" ? <Link className="text-brand" href="/mijn-voordelen">Bekijk je voucher →</Link> : <button className="mt-4 text-brand" disabled={busy} onClick={async () => { setBusy(true); try {
        setCheckout((await api<Envelope<Checkout>>("consumer/checkouts/" + checkout.id)).data);
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }}>Betalingsstatus vernieuwen</button>}</div>}</Panel> : <Panel><p>{r.payload.data.how_to_obtain === "earn_with_purchase" ? "Deze voucher verdien je na een in aanmerking komende aankoop bij de webshop." : "Deze aanbieding wordt via een persoonlijke claimlink beschikbaar gesteld."}</p><Link className="mt-4 inline-block text-brand" href={"/webshops/" + r.payload.data.webshop.slug}>Naar de webshop →</Link></Panel>}</>}</Page>;
}
export function BenefitsPage() { return <SessionGate><Benefits /></SessionGate>; }
function Benefits() {
    const [filter, setFilter] = useState("all"), [page, setPage] = useState(1);
    const r = useResource<Row[]>("consumer/vouchers?filter=" + filter), tx = useResource<Row[]>("consumer/wallet/transactions?page=" + page);
    const [detail, setDetail] = useState<Row | null>(null), [error, setError] = useState("");
    const { copyCode } = useShopBonus();
    return <Page title="Mijn voordelen"><ResourcePanel path="consumer/wallet" title="Mijn ShopBonus-tegoed"/><Panel title="Mijn vouchers"><select className="form-input max-w-xs" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Alle vouchers</option><option value="active">Actief</option><option value="used">Gebruikt</option><option value="expired">Verlopen</option></select><ErrorNotice message={r.error || error}/>{r.payload?.data.length === 0 && <p className="my-5">Je hebt nog geen vouchers.</p>}{r.payload?.data.map(v => <div key={String(v.id)} className="my-4 rounded-xl border border-blue-100 p-4"><h3 className="font-bold">{String(v.title || "Voucher")}</h3><p className="my-3">{String(v.summary || "")} · {String(v.status)}</p><button className="font-bold text-brand" onClick={async () => { try {
        setDetail((await api<Envelope<Row>>("consumer/vouchers/" + v.id)).data);
        setError("");
    }
    catch (e) {
        setError(message(e));
    } }}>Bekijk voucher en code →</button></div>)}</Panel>{detail && <Panel title="Voucherdetails"><DataView value={detail}/>{typeof detail.code === "string" && <Button type="button" onClick={() => void copyCode(detail.code as string)}>Code kopiëren</Button>}<ActionForm title="Probleem met deze voucher" fields={[{ name: "reason", label: "Reden", options: [["code_invalid", "Code ongeldig"], ["code_already_used", "Code al gebruikt"], ["other", "Anders"]] }, { name: "description", label: "Omschrijving", type: "textarea" }]} submitLabel="Meld probleem" submit={v => mutate("consumer/disputes", { ...v, voucher_id: detail.id })}/></Panel>}<Panel title="Transacties"><ErrorNotice message={tx.error}/><DataView value={tx.payload?.data}/>{tx.payload?.meta && <Pager page={page} last={tx.payload.meta.last_page} onChange={setPage}/>}</Panel><ResourcePanel path="consumer/disputes" title="Mijn meldingen"/><ResourcePanel path="consumer/favorites" title="Mijn favoriete webshops"/></Page>;
}
export function ProfilePage() { return <SessionGate><Profile /></SessionGate>; }
function Profile() {
    const r = useResource<Row>("consumer/profile"), prefs = useResource<Row>("consumer/preferences");
    const { refresh } = useSession();
    return <Page title="Mijn profiel"><ErrorNotice message={r.error}/>{r.payload && <ActionForm key={String(r.payload.data.id)} title="Persoonlijke gegevens" initial={{ first_name: String(r.payload.data.first_name || ""), phone: String(r.payload.data.phone || "") }} fields={[{ name: "first_name", label: "Voornaam" }, { name: "phone", label: "Telefoon met landcode", optional: true }]} submit={v => mutate("consumer/profile", { ...v, phone: v.phone || null }, "PATCH")} onSuccess={() => { r.reload(); void refresh(); }}/>}
 <ActionForm title="E-mailadres wijzigen" fields={[{ name: "email", label: "Nieuw e-mailadres", type: "email" }, { name: "current_password", label: "Huidig wachtwoord", type: "password" }]} submitLabel="Verificatie aanvragen" submit={v => mutate("consumer/email-change", v)}/>
 <ActionForm title="Nieuw e-mailadres bevestigen" fields={[{ name: "code", label: "Code uit de e-mail" }]} submit={v => mutate("consumer/email-change/confirm", v)} onSuccess={() => { r.reload(); void refresh(); }}/>
 <ActionForm title="Wachtwoord wijzigen" fields={[{ name: "current_password", label: "Huidig wachtwoord", type: "password" }, { name: "password", label: "Nieuw wachtwoord", type: "password" }, { name: "password_confirmation", label: "Herhaal wachtwoord", type: "password" }]} submit={v => mutate("/user/password", v, "PUT")}/>
 <Panel title="E-mailvoorkeuren"><ErrorNotice message={prefs.error}/>{prefs.payload && <PreferenceSwitches preferences={prefs.payload.data} reload={prefs.reload}/>}</Panel></Page>;
}
function PreferenceSwitches({ preferences, reload }: {
    preferences: Row;
    reload: () => void;
}) {
    const notifications = preferences.notifications as Record<string, boolean>;
    const [busy, setBusy] = useState(false), [error, setError] = useState("");
    return <><ErrorNotice message={error}/>{Object.entries(notifications || {}).map(([k, v]) => <label key={k} className="my-3 flex gap-3"><input type="checkbox" checked={v} disabled={busy} onChange={async (e) => { setBusy(true); try {
        await mutate("consumer/preferences", { notifications: { [k]: e.target.checked } }, "PUT");
        reload();
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }}/>{({ vouchers_discounts: "Vouchers en kortingen", reminders: "Herinneringen", offers_inspiration: "Aanbiedingen en inspiratie" } as Record<string, string>)[k] || k}</label>)}</>;
}
export function MerchantPage({ view = "dashboard" }: {
    view?: "dashboard" | "analytics" | "notifications" | "settings" | "offers";
}) {
    const base = useWorkspace();
    if (!base)
        return null;
    if (view === "offers")
        return <Offers base={base}/>;
    if (view === "settings")
        return <MerchantSettings base={base}/>;
    if (view === "notifications")
        return <Notifications base={base}/>;
    return <Page title={view === "analytics" ? "Statistieken" : "Webshop overzicht"}><ResourcePanel path={base + (view === "analytics" ? "/analytics/overview" : "/dashboard")} title={view === "analytics" ? "Resultaten" : "Overzicht"}/>{view === "analytics" && <ResourcePanel path={base + "/analytics/claims?days=30"} title="Voucheractiviteit afgelopen 30 dagen"/>}</Page>;
}
function Notifications({ base }: {
    base: string;
}) {
    const [page, setPage] = useState(1), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const r = useResource<Row[]>(base + "/notifications?page=" + page);
    async function read(path: string) { setBusy(true); try {
        await mutate(path);
        r.reload();
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }
    return <Page title="Meldingen"><Button disabled={busy} onClick={() => void read(base + "/notifications/read-all")}>Alles als gelezen markeren</Button><ErrorNotice message={r.error || error}/>{r.payload?.data.map(n => <Panel key={String(n.id)}><DataView value={n}/>{!n.read_at && <button disabled={busy} className="mt-4 text-brand" onClick={() => void read(base + "/notifications/" + n.id + "/read")}>Markeer als gelezen</button>}</Panel>)}{r.payload?.data.length === 0 && <Panel>Je hebt geen meldingen.</Panel>}{r.payload?.meta && <Pager page={page} last={r.payload.meta.last_page} onChange={setPage}/>}</Page>;
}
const businessFields: FormField[] = [{ name: "legal_name", label: "Juridische bedrijfsnaam" }, { name: "trading_name", label: "Handelsnaam", optional: true }, { name: "website_url", label: "Website", type: "url" }, { name: "kvk_number", label: "KvK-nummer" }, { name: "vat_number", label: "Btw-nummer", optional: true }, { name: "contact_email", label: "Contact e-mail", type: "email" }, { name: "contact_phone", label: "Contact telefoon" }, { name: "main_contact_name", label: "Contactpersoon" }, { name: "address_line", label: "Adres" }, { name: "postal_code", label: "Postcode" }, { name: "city", label: "Plaats" }, { name: "country_code", label: "Landcode (bijvoorbeeld NL)" }];
function MerchantSettings({ base }: {
    base: string;
}) {
    const r = useResource<Row>(base + "/business-profile"), w = useResource<Row>(base);
    const { refresh } = useSession();
    const [amount, setAmount] = useState(""), [error, setError] = useState(""), [checkout, setCheckout] = useState<Row | null>(null), [busy, setBusy] = useState(false);
    const key = useRef<string | null>(null);
    return <Page title="Webshop instellingen"><ErrorNotice message={r.error}/>{w.payload && <ActionForm title="Webshopnaam" initial={{ name: String(w.payload.data.name) }} fields={[{ name: "name", label: "Naam" }]} submit={v => mutate(base, v, "PATCH")} onSuccess={() => void refresh()}/>}
 {r.payload && <ActionForm key={base} title="Bedrijfsgegevens" fields={businessFields} initial={Object.fromEntries(businessFields.map(f => [f.name, String(r.payload!.data[f.name] || "")]))} submit={v => mutate(base + "/business-profile", { ...v, source: "manual", confirm: true }, "PUT")} onSuccess={r.reload}/>}
 <ResourcePanel path={base + "/funding"} title="Voucherfinanciering"/>
 <Panel title="Tegoed opwaarderen"><form onSubmit={async (e) => { e.preventDefault(); if (busy)
        return; setBusy(true); key.current ??= crypto.randomUUID(); try {
        setCheckout((await mutate<Envelope<Row>>(base + "/funding/top-ups", { amount_minor: Math.round(Number(amount) * 100) }, "POST", { "Idempotency-Key": key.current })).data);
        setError("");
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }}><Field label="Bedrag in euro" name="amount" type="number" value={amount} onChange={v => { setAmount(v); key.current = null; }} required/><ErrorNotice message={error}/><Button disabled={busy || !!checkout}>Opwaardering aanvragen</Button></form>{checkout && <><DataView value={checkout}/>{typeof checkout.checkout_url === "string" && <a className="primary-button" href={checkout.checkout_url}>Naar betaling →</a>}</>}</Panel><ResourcePanel path={base + "/invoices"} title="Facturen"/></Page>;
}
export function OnboardingPage() { return <SessionGate><Onboarding /></SessionGate>; }
function Onboarding() {
    const { session, refresh } = useSession();
    const base = useWorkspace();
    return <Page title="Meld je webshop aan"><p className="text-muted">Sla je bedrijfsgegevens op, bevestig het eigendom en bekijk je overeenkomst.</p><ActionForm title="Nieuwe webshop" fields={[{ name: "name", label: "Webshopnaam" }]} submitLabel="Webshop aanmaken" submit={v => mutate("workspaces", v)} onSuccess={() => void refresh()}/>
 {base && <><MerchantSettings key={base} base={base}/><ResourcePanel path={base + "/onboarding"} title="Voortgang aanmelding"/><Ownership base={base}/><Agreement base={base}/></>}<p className="text-sm text-muted">Aangemeld als {session?.email}</p></Page>;
}
function Ownership({ base }: {
    base: string;
}) {
    const r = useResource<Row[]>(base + "/ownership/verifications");
    return <><ActionForm title="Eigendom bevestigen" fields={[{ name: "method", label: "Methode", options: [["dns_txt", "DNS TXT-record"], ["website_file", "HTML-bestand"], ["domain_email", "E-mail"]] }, { name: "mailbox", label: "Mailbox (bij e-mail)", optional: true }]} submit={v => mutate(base + "/ownership/verifications", { ...v, mailbox: v.mailbox || undefined })} onSuccess={r.reload}/><Panel title="Verificaties"><ErrorNotice message={r.error}/>{r.payload?.data.map(v => <Verification key={String(v.id)} base={base} verification={v} reload={r.reload}/>)}</Panel></>;
}
function Verification({ base, verification: v, reload }: {
    base: string;
    verification: Row;
    reload: () => void;
}) {
    const [error, setError] = useState(""), [busy, setBusy] = useState(false);
    return <div className="my-5"><DataView value={v}/><ErrorNotice message={error}/><Button disabled={busy} onClick={async () => { setBusy(true); try {
        await mutate(base + "/ownership/verifications/" + v.id + "/check");
        reload();
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }}>Verificatie controleren</Button><ActionForm title="E-mailcode bevestigen" fields={[{ name: "code", label: "Verificatiecode" }]} submit={values => mutate(base + "/ownership/verifications/" + v.id + "/confirm-code", values)} onSuccess={reload}/></div>;
}
function Agreement({ base }: {
    base: string;
}) {
    const r = useResource<Row>(base + "/agreement");
    return <Panel title="Webshopovereenkomst"><ErrorNotice message={r.error}/>{r.payload && <><DataView value={r.payload.data}/><ActionForm title="Overeenkomst accepteren" fields={[{ name: "signatory_name", label: "Naam tekenbevoegde" }]} submitLabel="Getoonde overeenkomst accepteren" submit={v => mutate(base + "/agreement/accept", { ...v, version: r.payload!.data.version, document_hash: r.payload!.data.document_hash, accept: true, confirm_identity: true })} onSuccess={r.reload}/></>}</Panel>;
}
const offerFields: FormField[] = [{ name: "name", label: "Naam" }, { name: "discount_type", label: "Kortingsvorm", options: [["fixed", "Vast bedrag"], ["percentage", "Percentage"]] }, { name: "discount", label: "Korting in euro of procent", type: "number" }, { name: "minimum", label: "Minimale bestelling in euro", type: "number", optional: true }, { name: "maximum", label: "Maximale korting in euro", type: "number", optional: true }, { name: "price", label: "Voucherprijs in euro", type: "number", optional: true }, { name: "redemption_validity_days", label: "Geldigheid in dagen", type: "number", optional: true }, { name: "public_description", label: "Beschrijving", type: "textarea", optional: true }];
function Offers({ base }: {
    base: string;
}) {
    const r = useResource<Row[]>(base + "/offers");
    const [selected, setSelected] = useState<Row | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const body = (v: Record<string, string>) => ({ name: v.name, discount_type: v.discount_type, discount_value: Math.round(Number(v.discount) * 100), min_order_minor: Math.round(Number(v.minimum || 0) * 100), max_discount_minor: v.maximum ? Math.round(Number(v.maximum) * 100) : null, price_minor: v.price ? Math.round(Number(v.price) * 100) : null, redemption_validity_days: v.redemption_validity_days ? Number(v.redemption_validity_days) : undefined, public_description: v.public_description || null });
    async function transition(id: Value, action: string) { setBusy(true); try {
        await mutate(base + "/offers/" + id + "/" + action);
        r.reload();
        setSelected(null);
        setError("");
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }
    return <Page title="Aanbiedingen"><ErrorNotice message={r.error || error}/><ActionForm title="Nieuwe aanbieding" fields={[{ name: "acquisition", label: "Soort aanbieding", options: [["merchant_reward", "Beloning na aankoop"], ["wallet_purchase", "Voucher kopen"], ["promotional_code", "Promotiecode"]] }, ...offerFields]} submitLabel="Concept aanmaken" submit={v => mutate(base + "/offers", { ...body(v), acquisition: v.acquisition })} onSuccess={r.reload}/>{r.payload?.data.length === 0 && <Panel>Je hebt nog geen aanbiedingen.</Panel>}
 {r.payload?.data.map(o => <Panel key={String(o.id)}><h2 className="mb-4 text-xl font-black">{String((o.terms as Row)?.name || "Aanbieding")}</h2><DataView value={o}/><div className="mt-5 flex flex-wrap gap-5"><button className="font-bold text-brand" onClick={() => setSelected(o)}>Bewerken & codes</button>{["draft", "paused"].includes(String(o.status)) && <button disabled={busy} className="text-brand" onClick={() => void transition(o.id, "activate")}>Activeren</button>}{o.status === "active" && <button disabled={busy} className="text-brand" onClick={() => void transition(o.id, "pause")}>Pauzeren</button>}{o.status !== "ended" && <button disabled={busy} className="text-red-700" onClick={() => void transition(o.id, "end")}>Beëindigen</button>}</div></Panel>)}
 {selected && <OfferEditor key={String(selected.id)} base={base} offer={selected} reload={() => { r.reload(); setSelected(null); }}/>}</Page>;
}
function OfferEditor({ base, offer, reload }: {
    base: string;
    offer: Row;
    reload: () => void;
}) {
    const t = offer.terms as Row;
    const codesPath = base + "/offers/" + offer.id;
    const [codePage, setCodePage] = useState(1);
    const r = useResource<Row[]>(codesPath + "/codes?page=" + codePage);
    const [batch, setBatch] = useState<Row | null>(null), [error, setError] = useState(""), [revealed, setRevealed] = useState(""), [busy, setBusy] = useState(false);
    const numberField = (k: string) => t[k] === null || t[k] === undefined ? "" : String(Number(t[k]) / 100);
    return <Panel title="Aanbieding beheren"><ActionForm title="Voorwaarden bewerken" fields={offerFields} initial={{ name: String(t.name), discount_type: String(t.discount_type), discount: numberField("discount_value"), minimum: numberField("min_order_minor"), maximum: numberField("max_discount_minor"), price: numberField("price_minor"), redemption_validity_days: String(t.redemption_validity_days || ""), public_description: String(t.public_description || "") }} submit={v => mutate(codesPath, { name: v.name, discount_type: v.discount_type, discount_value: Math.round(Number(v.discount) * 100), min_order_minor: Math.round(Number(v.minimum || 0) * 100), max_discount_minor: v.maximum ? Math.round(Number(v.maximum) * 100) : null, price_minor: v.price ? Math.round(Number(v.price) * 100) : null, public_description: v.public_description || null, redemption_validity_days: v.redemption_validity_days ? Number(v.redemption_validity_days) : null }, "PATCH")} onSuccess={reload}/>
 <ActionForm title="Codes importeren (één per regel)" fields={[{ name: "codes", label: "Codes", type: "textarea" }]} submitLabel="Import controleren" submit={async (v) => setBatch((await mutate<Envelope<Row>>(codesPath + "/code-imports", v)).data)}/>
 <Panel title="Codes uploaden"><p className="mb-4 text-sm text-muted">Upload een CSV-bestand met de codes in de eerste kolom of in een kolom met de naam code. Sla Excel-bestanden eerst op als CSV.</p><input aria-label="CSV-bestand met vouchercodes" type="file" accept=".csv,.txt,text/csv,text/plain" disabled={busy} onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
        return; setBusy(true); try {
        const form = new FormData();
        form.append("file", file);
        setBatch((await api<Envelope<Row>>(codesPath + "/code-imports", { method: "POST", body: form })).data);
        setError("");
    }
    catch (error) {
        setError(message(error));
    }
    finally {
        setBusy(false);
    } }}/></Panel>
 {batch && <Panel title="Importvoorbeeld"><DataView value={batch}/><Button disabled={busy || batch.status !== "preview"} onClick={async () => { setBusy(true); try {
        setBatch((await mutate<Envelope<Row>>(base + "/code-imports/" + batch.id + "/commit")).data);
        r.reload();
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }}>Import bevestigen</Button></Panel>}
 <ErrorNotice message={r.error || error}/>{revealed && <p className="my-5 select-all rounded-xl bg-blue-50 p-4 font-mono">{revealed}</p>}<a className="text-brand" href={apiPath(codesPath + "/codes/export")}>Codes exporteren →</a>
 {r.payload?.data.map(c => <Panel key={String(c.id)}><DataView value={c}/><button disabled={busy} className="my-3 text-brand" onClick={async () => { setBusy(true); try {
        setRevealed((await mutate<Envelope<{
            code: string;
        }>>(base + "/codes/" + c.id + "/reveal")).data.code);
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }}>Code tonen</button>{c.status === "available" && <ActionForm title="Code ongeldig maken" fields={[{ name: "reason", label: "Reden" }]} submitLabel="Ongeldig maken" submit={v => mutate(base + "/codes/" + c.id + "/invalidate", v)} onSuccess={r.reload}/>}</Panel>)}
 {r.payload?.meta && <Pager page={codePage} last={r.payload.meta.last_page} onChange={setCodePage}/>}
 <ActionForm title="Voucher inwisselen" fields={[{ name: "code", label: "Vouchercode" }, { name: "reference", label: "Bestelreferentie", optional: true }]} submitLabel="Inwisseling bevestigen" submit={v => mutate(base + "/vouchers/redeem", v)} onSuccess={r.reload}/></Panel>;
}
export function AdminPage() { return <SessionGate><Admin /></SessionGate>; }
function Admin() {
    const { session } = useSession();
    const [tab, setTab] = useState("cockpit");
    if (!session?.roles.includes("super_admin"))
        return <Page title="Beheer"><ErrorNotice message="Je account heeft geen beheerrechten."/></Page>;
    return <Page title="Platformbeheer"><div className="flex flex-wrap gap-4">{[["cockpit", "Overzicht"], ["activity", "Activiteit"], ["users", "Gebruikers"], ["webshops", "Webshops"], ["disputes", "Meldingen"], ["incidents", "Incidenten"], ["financial-oversight", "Financiën"]].map(([k, v]) => <button key={k} className="font-bold text-brand" onClick={() => setTab(k)}>{v}</button>)}</div>
 <ActionForm title="Bevestig je wachtwoord voor beheeracties" fields={[{ name: "password", label: "Wachtwoord", type: "password" }]} submitLabel="Bevestigen" submit={v => mutate("/user/confirm-password", v)}/>
 <AdminRecords key={tab} tab={tab}/></Page>;
}
function AdminRecords({ tab }: {
    tab: string;
}) {
    const [page, setPage] = useState(1), [selected, setSelected] = useState<Row | null>(null);
    const r = useResource<Value>("admin/" + tab + "?page=" + page);
    return <><Panel title="Actuele gegevens"><ErrorNotice message={r.error}/>{Array.isArray(r.payload?.data) ? r.payload.data.map((item, i) => <div key={i} className="my-4 border-b border-blue-100 pb-4"><DataView value={item}/>{item && typeof item === "object" && !Array.isArray(item) && typeof item.id === "string" && ["users", "webshops", "disputes"].includes(tab) && <button className="mt-3 text-brand" onClick={() => setSelected(item)}>Beheren →</button>}</div>) : <DataView value={r.payload?.data}/>}
 {r.payload?.meta && <Pager page={page} last={r.payload.meta.last_page} onChange={setPage}/>}</Panel>{selected && <AdminActions key={String(selected.id)} tab={tab} row={selected} reload={() => { setSelected(null); r.reload(); }}/>}</>;
}
function AdminActions({ tab, row, reload }: {
    tab: string;
    row: Row;
    reload: () => void;
}) {
    const path = "admin/" + tab + "/" + row.id;
    const actions: [
        string,
        string
    ][] = tab === "users" ? [["suspend", "Opschorten"], ["reactivate", "Heractiveren"]] : tab === "webshops" ? [["approve", "Goedkeuren"], ["reject", "Afwijzen"], ["suspend", "Opschorten"], ["unsuspend", "Heractiveren"]] : [];
    return <Panel title="Beheer geselecteerde gegevens"><ResourcePanel path={path} title="Details"/>{actions.length > 0 && <ActionForm title="Status wijzigen" fields={[{ name: "action", label: "Actie", options: actions }, { name: "reason", label: "Reden", type: "textarea" }]} submitLabel="Wijziging bevestigen" submit={v => mutate(path + "/" + v.action, { reason: v.reason })} onSuccess={reload}/>}
 {tab === "webshops" && <ActionForm title="Meer informatie aanvragen" fields={[{ name: "message", label: "Bericht", type: "textarea" }]} submitLabel="Versturen" submit={v => mutate(path + "/request-information", v)} onSuccess={reload}/>}
 {tab === "disputes" && <><ActionForm title="Melding behandelen" fields={[{ name: "status", label: "Status", options: [["under_review", "In behandeling"], ["waiting_for_merchant", "Wacht op webshop"]] }, { name: "note", label: "Toelichting", type: "textarea" }]} submit={v => mutate(path + "/status", v)} onSuccess={reload}/><ActionForm title="Melding afronden" fields={[{ name: "outcome", label: "Uitkomst", options: [["resolved", "Opgelost"], ["rejected", "Afgewezen"]] }, { name: "note", label: "Toelichting", type: "textarea" }]} submitLabel="Afronden zonder compensatie" submit={v => mutate(path + "/resolve", { ...v, compensation: "none" })} onSuccess={reload}/></>}</Panel>;
}
function RichText({ node }: {
    node: Value;
}): ReactNode {
    if (!node || typeof node !== "object" || Array.isArray(node))
        return null;
    if (node.type === "text") {
        let child: ReactNode = String(node.text || "");
        if (Array.isArray(node.marks))
            for (const mark of node.marks) {
                if (mark && typeof mark === "object" && !Array.isArray(mark)) {
                    if (mark.type === "bold")
                        child = <strong>{child}</strong>;
                    if (mark.type === "italic")
                        child = <em>{child}</em>;
                }
            }
        return child;
    }
    const children = Array.isArray(node.content) ? node.content.map((c, i) => <RichText key={i} node={c}/>) : null;
    if (node.type === "paragraph")
        return <p className="my-3 leading-relaxed">{children}</p>;
    if (node.type === "heading")
        return <h2 className="my-5 text-2xl font-bold">{children}</h2>;
    if (node.type === "bulletList")
        return <ul className="my-4 list-disc pl-6">{children}</ul>;
    if (node.type === "orderedList")
        return <ol className="my-4 list-decimal pl-6">{children}</ol>;
    if (node.type === "listItem")
        return <li>{children}</li>;
    return <>{children}</>;
}
export function ContentPage({ slug }: {
    slug: string;
}) {
    const r = useResource<Row>("public/pages/nl/" + encodeURIComponent(slug));
    const content = r.payload?.data.content as Row | undefined;
    return <Page title={String(content?.title || "Informatie")}><ErrorNotice message={r.error}/>{content && <Panel><RichText node={content.body}/></Panel>}</Page>;
}
export function CheckoutReturnPage({ id }: {
    id: string;
}) { return <SessionGate><CheckoutReturn id={id}/></SessionGate>; }
function CheckoutReturn({ id }: {
    id: string;
}) {
    const r = useResource<Checkout>("consumer/checkouts/" + encodeURIComponent(id));
    return <Page title="Status van je aankoop"><ErrorNotice message={r.error}/>{r.payload && <Panel><DataView value={r.payload.data as unknown as Row}/>{r.payload.data.state === "completed" ? <Link className="primary-button mt-5" href="/mijn-voordelen">Bekijk je voucher →</Link> : <><p className="my-5">De status wordt bevestigd door de betaalprovider.</p><Button type="button" onClick={r.reload}>Status vernieuwen</Button></>}</Panel>}</Page>;
}
export function FundingReturnPage({ id }: {
    id: string;
}) { return <SessionGate><FundingReturn id={id}/></SessionGate>; }
function FundingReturn({ id }: {
    id: string;
}) { const base = useWorkspace(); return <Page title="Status opwaardering"><ResourcePanel path={base && id ? base + "/funding/top-ups/" + encodeURIComponent(id) : null} title="Betalingsstatus"/><Link className="text-brand" href="/dashboard/settings">Terug naar financiering →</Link></Page>; }
export function ClaimPage({ token }: {
    token: string;
}) {
    const { session } = useSession();
    const [preview, setPreview] = useState<Row | null>(null), [accepted, setAccepted] = useState<Row | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    async function load() { setBusy(true); try {
        setPreview((await mutate<Envelope<Row>>("claims/preview", { token })).data);
        setError("");
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }
    return <Page title="Je persoonlijke voucher"><ErrorNotice message={error}/>{!preview && <Button type="button" disabled={busy} onClick={() => void load()}>Bekijk je voucher</Button>}{preview && <Panel><DataView value={preview}/>{!session || !session.email_verified ? <Link className="primary-button mt-5" href={"/account?mode=login&next=" + encodeURIComponent("/claim/" + token)}>Inloggen en e-mail bevestigen →</Link> : <Button disabled={busy || !!accepted} onClick={async () => { setBusy(true); try {
        setAccepted((await mutate<Envelope<Row>>("claims/accept", { token })).data);
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }}>Voucher claimen</Button>}</Panel>}{accepted && <Panel title="Jouw voucher"><DataView value={accepted}/><Link className="text-brand" href="/mijn-voordelen">Naar mijn voordelen →</Link></Panel>}</Page>;
}
export function ResetPasswordPage({ token, email }: {
    token: string;
    email: string;
}) { return <Page title="Wachtwoord herstellen"><ActionForm title="Kies een nieuw wachtwoord" fields={[{ name: "email", label: "E-mailadres", type: "email" }, { name: "password", label: "Nieuw wachtwoord", type: "password" }, { name: "password_confirmation", label: "Herhaal wachtwoord", type: "password" }]} initial={{ email }} submit={v => mutate("/reset-password", { ...v, token })}/><Link className="text-brand" href="/account?mode=login">Naar inloggen →</Link></Page>; }
