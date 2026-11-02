"use client";
import { useEffect, useState } from "react";
import { useInlineCms } from "./InlineCms";
import { useLocale } from "@/i18n/LocaleContext";
import { ApiError, apiRequest } from "@/lib/api";

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
  const text = (nl: string, en: string) => locale === "en" ? en : nl;
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [slot, setSlot] = useState("desktop");
  const [ratio, setRatio] = useState("1.7777777778");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); queueMicrotask(() => setSource(url)); return () => URL.revokeObjectURL(url); }, [file]);
  const upload = async () => {
    if (!file) return;
    setBusy(true); setError("");
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) throw new Error(text("Kies PNG, JPEG of WebP tot 4 MB.", "Choose PNG, JPEG or WebP up to 4 MB."));
      const bitmap = await createImageBitmap(file);
      try {
        const aspect = Number(ratio);
        const width = Math.min(bitmap.width, bitmap.height * aspect), height = width / aspect;
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(slot === "mobile" ? 768 : 1920, Math.round(width));
        canvas.height = Math.round(canvas.width / aspect);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(bitmap, (bitmap.width - width) * x / 100, (bitmap.height - height) * y / 100, width, height, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(v => v ? resolve(v) : reject(new Error("Crop failed")), "image/webp", .9));
        const form = new FormData(); form.append("image", blob, "homepage.webp");
        const res = await apiRequest<{data: {id: string; url: string}}>({path: "/api/v1/admin/content/homepage/assets", method: "POST", body: form, locale});
        if (slot === "seo") { cms.updateField("seo_image_asset_id", res.data.id); cms.updateField("seo_image_url", res.data.url); }
        else { cms.updateField("hero." + (slot === "mobile" ? "background_mobile_asset_id" : "background_asset_id"), res.data.id); cms.updateField("hero." + (slot === "mobile" ? "background_mobile_url" : "background_url"), res.data.url); }
        setFile(null); setSource("");
      } finally { bitmap.close(); }
    } catch (err) { if (err instanceof ApiError && err.code === "password_confirmation_required") cms.requestPasswordConfirmation(); setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  };
  return <fieldset disabled={busy || cms.saving} className="space-y-3"><label>{text("Afbeelding", "Image")}<select aria-label="Image variant" value={slot} onChange={e => setSlot(e.target.value)}><option value="desktop">Desktop hero</option><option value="mobile">Mobile hero</option><option value="seo">SEO</option></select></label><Field path="hero.background_alt" value={cms.content.hero.background_alt ?? ""} /><label>{text("Alternatieve tekst", "Alternative text")}<input className={inputClass} value={cms.content.hero.background_alt ?? ""} onChange={e => cms.updateField("hero.background_alt", e.target.value)} /></label>
    <input aria-label="Upload image" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} />
    {file && source && <div><label>{text("Bijsnijden", "Crop")}<select aria-label="Crop ratio" value={ratio} onChange={e => setRatio(e.target.value)}><option value="1.7777777778">16:9</option><option value="1">1:1</option><option value="0.8">4:5</option></select></label>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={source} alt={text("Uitsnedevoorbeeld", "Crop preview")} className="max-h-56 w-full object-cover" style={{ aspectRatio: ratio, objectPosition: x + "% " + y + "%" }} />
      <label>{text("Horizontale focus", "Horizontal focus")}<input aria-label="Horizontal crop focus" type="range" value={x} onChange={e => setX(Number(e.target.value))} /></label><label>{text("Verticale focus", "Vertical focus")}<input aria-label="Vertical crop focus" type="range" value={y} onChange={e => setY(Number(e.target.value))} /></label><button type="button" onClick={() => void upload()}>{busy ? text("Uploaden…", "Uploading…") : text("Uitsnede uploaden", "Upload cropped image")}</button></div>}
    <button type="button" onClick={() => { if (slot === "seo") {cms.updateField("seo_image_asset_id", null); cms.updateField("seo_image_url", null);} else {cms.updateField("hero." + (slot === "mobile" ? "background_mobile_asset_id" : "background_asset_id"), null);cms.updateField("hero." + (slot === "mobile" ? "background_mobile_url" : "background_url"), null);} }}>{text("Afbeelding verwijderen", "Remove image")}</button>{error && <p role="alert">{error}</p>}
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
