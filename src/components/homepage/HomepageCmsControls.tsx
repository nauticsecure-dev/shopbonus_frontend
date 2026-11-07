"use client";
import RecipeMediaEditor from "@/components/cms/RecipeMediaEditor";
import { useState } from "react";
import { useInlineCms } from "./InlineCms";
import { useLocale } from "@/i18n/LocaleContext";
import { ApiError } from "@/lib/api";

const inputClass = "w-full rounded-lg border border-blue-200 bg-white p-2 text-sm text-navy";
function Field({ path, value }: { path: string; value: unknown }) {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const text = (nl: string, en: string) => locale === "en" ? en : nl;
  if (/(asset_id|_url)$/.test(path) || path.endsWith("background_alt")) return null;
  if (Array.isArray(value)) return <fieldset className="space-y-2 border p-2"><legend>{path}</legend>{value.map((v, i) => <div key={i}><Field path={path + "." + i} value={v} /><button type="button" onClick={() => cms.updateField(path, value.filter((_, index) => index !== i))}>{text("Verwijderen", "Remove")}</button></div>)}<button type="button" onClick={() => cms.updateField(path, [...value, path === "nav.links" ? { label: text("Nieuwe link", "New link"), href: "/" } : ""])}>{text("Toevoegen", "Add")}</button></fieldset>;
  if (value && typeof value === "object") return <div className="space-y-2">{Object.entries(value).map(([key, v]) => <Field key={key} path={path + "." + key} value={v} />)}</div>;
  if (typeof value === "boolean") return null;
  if (path === "popular_webshops.mode") return <label>{text("Selectie", "Selection")}<select aria-label={path} value={String(value)} onChange={e => cms.updateField(path, e.target.value)}><option value="auto">Auto</option><option value="featured">{text("Uitgelicht", "Featured")}</option></select></label>;
  return <label className="block text-xs font-semibold">{path}{typeof value === "number" ? <input className={inputClass} aria-label={path} type="number" min={1} max={path.startsWith("discount_codes") ? 20 : 24} value={value} onChange={e => cms.updateField(path, Number(e.target.value))} /> : <textarea className={inputClass} aria-label={path} rows={2} value={String(value ?? "")} onChange={e => cms.updateField(path, e.target.value)} />}</label>;
}
function MediaEditor() {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const t = (nl: string, en: string, de: string) => ({ nl, en, de })[locale];
  const [slot, setSlot] = useState("hero");
  const [variant, setVariant] = useState<"desktop" | "mobile">("desktop");
  const path = slot === "seo" ? "seo_image_asset_id" : "hero." + (variant === "mobile" ? "background_mobile_asset_id" : "background_asset_id");
  const urlPath = slot === "seo" ? "seo_image_url" : "hero." + (variant === "mobile" ? "background_mobile_url" : "background_url");
  const assetId = slot === "seo" ? cms.content.seo_image_asset_id : variant === "mobile" ? cms.content.hero.background_mobile_asset_id : cms.content.hero.background_asset_id;
  const pins = cms.content.media_recipes ?? {};
  return <fieldset disabled={cms.saving || !cms.draftReady} className="space-y-3">
    <label>{t("Afbeelding", "Image", "Bild")}<select aria-label="Image slot" value={slot} onChange={event => setSlot(event.target.value)}><option value="hero">Hero</option><option value="seo">SEO</option></select></label>
    <label>{t("Variant", "Variant", "Variante")}<select aria-label="Image variant" value={variant} onChange={event => setVariant(event.target.value as "desktop" | "mobile")}><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></label>
    <label>{t("Alternatieve tekst", "Alternative text", "Alternativtext")}<input className={inputClass} value={cms.content.hero.background_alt ?? ""} onChange={event => cms.updateField("hero.background_alt", event.target.value)} /></label>
    <RecipeMediaEditor key={path} breakpoint={variant} assetId={assetId} onError={error => { if (error instanceof ApiError && error.code === "password_confirmation_required") cms.requestPasswordConfirmation(); }} onApply={selection => {
      cms.updateField(path, selection.id); cms.updateField(urlPath, selection.url);
      cms.updateField("media_recipes", { ...pins, [path]: selection.recipe });
    }} />
    <button type="button" onClick={() => { cms.updateField(path, null); cms.updateField(urlPath, null); const next = { ...pins }; delete next[path]; cms.updateField("media_recipes", next); }}>{t("Afbeelding verwijderen", "Remove image", "Bild entfernen")}</button>
  </fieldset>;
}

export default function HomepageCmsControls() {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const [tab, setTab] = useState("content");
  const [open, setOpen] = useState(false);
  const text = (nl: string, en: string) => locale === "en" ? en : nl;
  const move = (from: number, to: number) => { const order = [...cms.content.section_order]; if (from < 0 || to < 0 || from >= order.length || to >= order.length) return; order.splice(to, 0, order.splice(from, 1)[0]); cms.updateField("section_order", order); };
  return <div><button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{text("Inhoud, afbeeldingen en volgorde", "Content, images and order")}</button>{open && <div className="max-h-[50vh] overflow-auto rounded-xl border bg-slate-50 p-3"><div className="flex gap-4">{["content", "media", "order"].map(key => <button type="button" key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{key === "content" ? text("Inhoud", "Content") : key === "media" ? text("Afbeeldingen", "Images") : text("Volgorde", "Order")}</button>)}</div><fieldset disabled={cms.saving || cms.draftRevision == null || cms.mode !== "edit"}>
    {tab === "content" && <div className="grid gap-4 md:grid-cols-2">{["nav", "hero", "search", "popular_webshops", "how_it_works", "benefits", "discount_codes", "wallet_preview", "cta_band", "faq_teaser", "footer"].map(key => <details key={key}><summary>{key}</summary><Field path={key} value={cms.content[key as keyof typeof cms.content]} /></details>)}</div>}
    {tab === "media" && <MediaEditor />}
    {tab === "order" && cms.content.section_order.map((key, i, order) => <div key={key} draggable onDragStart={e => e.dataTransfer.setData("text/plain", String(i))} onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault(); const source = e.dataTransfer.getData("text/plain"); if (/^\d+$/.test(source)) move(Number(source), i);}} className="flex gap-4 border p-2"><span>{key}</span><button type="button" disabled={i === 0} aria-label={"Move " + key + " up"} onClick={() => move(i, i-1)}>↑</button><button type="button" disabled={i === order.length-1} aria-label={"Move " + key + " down"} onClick={() => move(i, i+1)}>↓</button></div>)}
  </fieldset></div>}</div>;
}
