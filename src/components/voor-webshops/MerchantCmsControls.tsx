"use client";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { fetchMerchantLandingVersions } from "@/lib/merchantLanding";
import { merchantCmsText, merchantCmsError } from "@/i18n/merchantCmsCopy";
import { useLocale } from "@/i18n/LocaleContext";
import { merchantDraftPayload } from "@/lib/merchantLanding";
import { compareMerchantContent } from "@/lib/merchantRevisionComparison";
import { SECTION_KEYS } from "@/lib/merchantLandingDefaults";
import { useInlineCms } from "./MerchantInlineCms";

type Asset = { id: string; url: string; width: number; height: number };
const inputClass = "w-full rounded border border-blue-200 bg-white p-2 text-sm text-navy";
const choices: Record<string, string[]> = {
  "benefits.items.icon": ["people", "tag", "cog", "chart", "shield", "spark"],
  "onboarding.steps.icon": ["document", "link", "megaphone", "check", "shop"],
};
const templates: Record<string, unknown> = {
  "nav.links": { label: "New link", href: "/" },
  "footer.links": { label: "New link", href: "/" },
  "faq.items": { question: "New question", answer: "Answer" },
  "platforms.tiles": { platform: "new_platform", name: "New platform", description: "", status: "COMING_SOON", href: "/voor-webshops/aanmelden" },
  "benefits.items": { icon: "people", title: "New benefit", description: "Description" },
  "onboarding.steps": { number: "1", title: "New step", description: "Description", icon: "shop" },
  "hero.trust": "New trust statement",
};
function localizeTemplate(value: unknown, t: (text: string) => string): unknown {
  if (typeof value === "string") return value.startsWith("New ") || ["Answer", "Description"].includes(value) ? t(value) : value;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeTemplate(item, t)]));
  return value;
}
function Field({ path, value }: { path: string; value: unknown }) {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const t = (text: string) => merchantCmsText(locale, text);
  const label = path.split(".").at(-1)!;
  const fieldLabel = t(label);
  const normalized = path.split(".").filter((part) => !/^\d+$/.test(part)).join(".");
  if (/(url|asset_id|connectable|blocked_reason|status)$/.test(label)) return null;
  if (Array.isArray(value)) {
    const move = (from: number, to: number) => { if (to < 0 || to >= value.length) return; const next = [...value]; next.splice(to, 0, next.splice(from, 1)[0]); cms.updateField(path, next); };
    return <fieldset className="space-y-2 rounded border p-3"><legend>{fieldLabel}</legend>{value.map((item, i) => <div key={i} className="rounded border p-2" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", path + ":" + i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const [source, index] = e.dataTransfer.getData("text/plain").split(":"); if (source === path) move(Number(index), i); }}>
      <div className="flex gap-3"><span>{t("Item")} {i + 1}</span><button type="button" aria-label={t("Move") + " " + fieldLabel + " " + (i + 1) + " " + t("up")} onClick={() => move(i, i - 1)}>↑</button><button type="button" aria-label={t("Move") + " " + fieldLabel + " " + (i + 1) + " " + t("down")} onClick={() => move(i, i + 1)}>↓</button><button type="button" onClick={() => cms.updateField(path, value.filter((_, index) => index !== i))}>{t("Remove")}</button></div>
      <Field path={path + "." + i} value={item} />
    </div>)}{templates[path] !== undefined && <button type="button" onClick={() => cms.updateField(path, [...value, localizeTemplate(templates[path], t)])}>{t("Add")} {fieldLabel}</button>}</fieldset>;
  }
  if (value && typeof value === "object") return <div className="space-y-2">{Object.entries(value).map(([key, item]) => <Field key={key} path={path + "." + key} value={item} />)}</div>;
  if (typeof value === "boolean") return <label className="flex gap-2"><input type="checkbox" checked={value} onChange={(e) => cms.updateField(path, e.target.checked)} />{fieldLabel}</label>;
  const options = choices[normalized];
  return <label className="block text-xs font-semibold">{fieldLabel}{options ? <select aria-label={path.split(".").map((part) => /^\d+$/.test(part) ? String(Number(part) + 1) : t(part)).join(" / ")} data-cms-field={path} className={inputClass} value={String(value ?? "")} onChange={(e) => cms.updateField(path, e.target.value)}>{options.map((option) => <option key={option} value={option}>{t(option)}</option>)}</select> : <textarea aria-label={path.split(".").map((part) => /^\d+$/.test(part) ? String(Number(part) + 1) : t(part)).join(" / ")} data-cms-field={path} rows={label.includes("description") || label === "answer" ? 3 : 1} className={inputClass} value={String(value ?? "")} onChange={(e) => cms.updateField(path, e.target.value)} />}</label>;
}

function MediaEditor() {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const t = (text: string) => merchantCmsText(locale, text);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [slot, setSlot] = useState<"hero_background" | "hero" | "benefits" | "offers">("hero");
  const [variant, setVariant] = useState<"desktop" | "mobile">("desktop");
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [ratio, setRatio] = useState("original");
  const [focusX, setFocusX] = useState(50);
  const [focusY, setFocusY] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [uploaded, setUploaded] = useState<{ slot: typeof slot; variant: typeof variant; asset: Asset } | null>(null);
  const { saving, loading, content, updateField } = cms;
  useEffect(() => {
    if (!uploaded || saving || loading) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const current = content.media?.[uploaded.slot] ?? { alt: "" };
      updateField("media." + uploaded.slot, { ...current, [uploaded.variant + "_asset_id"]: uploaded.asset.id, [uploaded.variant + "_url"]: uploaded.asset.url });
      setUploaded(null);
    });
    return () => { cancelled = true; };
  }, [uploaded, saving, loading, content.media, updateField]);
  useEffect(() => {
    let cancelled = false;
    void apiRequest<{ data: Asset[]; meta: { last_page: number } }>({ path: "/api/v1/admin/content/voor-webshops/assets?page=" + page, cache: "no-store", locale }).then((res) => { if (!cancelled) { setAssets(res.data); setLastPage(res.meta.last_page); } }).catch((err) => { if (!cancelled) setError(merchantCmsError(locale, err, "Media could not be loaded")); });
    return () => { cancelled = true; };
  }, [page, reload, locale]);
  useEffect(() => { if (!file) { queueMicrotask(() => setSource("")); return; } const url = URL.createObjectURL(file); queueMicrotask(() => setSource(url)); return () => URL.revokeObjectURL(url); }, [file]);
  const media = cms.content.media?.[slot] ?? { alt: "" };
  const assign = (asset: Asset) => cms.updateField("media." + slot, { ...media, [variant + "_asset_id"]: asset.id, [variant + "_url"]: asset.url });
  const upload = async () => {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const aspect = ratio === "original" ? bitmap.width / bitmap.height : Number(ratio);
        const width = Math.min(bitmap.width, bitmap.height * aspect);
        const height = width / aspect;
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(variant === "mobile" ? 768 : 1920, Math.round(width));
        canvas.height = Math.round(canvas.width / aspect);
        const context = canvas.getContext("2d");
        if (!context) throw new Error(t("Image cropping is unavailable"));
        context.drawImage(bitmap, (bitmap.width - width) * focusX / 100, (bitmap.height - height) * focusY / 100, width, height, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error(t("Crop failed"))), "image/webp", 0.9));
        const form = new FormData(); form.append("image", blob, "merchant-image.webp");
        const res = await apiRequest<{ data: Asset }>({ path: "/api/v1/admin/content/voor-webshops/assets", method: "POST", body: form, locale });
        setUploaded({ slot, variant, asset: res.data }); setReload((value) => value + 1); setFile(null);
      } finally { bitmap.close(); }
    } catch (err) { setError(merchantCmsError(locale, err, "Upload failed")); }
    finally { setBusy(false); }
  };
  return <fieldset disabled={busy} className="space-y-3">
    <div className="flex gap-3"><label>{t("Image slot")}<select aria-label={t("Image slot")} value={slot} onChange={(e) => setSlot(e.target.value as typeof slot)}>{["hero_background", "hero", "benefits", "offers"].map((key) => <option key={key} value={key}>{t(key)}</option>)}</select></label><label>{t("Variant")}<select aria-label={t("Image variant")} value={variant} onChange={(e) => setVariant(e.target.value as typeof variant)}><option value="desktop">{t("desktop")}</option><option value="mobile">{t("mobile")}</option></select></label></div>
    <label className="block">{t("Alternative text")}<input className={inputClass} value={media.alt} onChange={(e) => cms.updateField("media." + slot, { ...media, alt: e.target.value })} /></label>
    <input aria-label={t("Replace image")} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
    {source && <div className="space-y-2"><label>{t("Crop")}<select aria-label={t("Crop ratio")} value={ratio} onChange={(e) => setRatio(e.target.value)}><option value="original">{t("Original")}</option><option value="1">{t("Square")}</option><option value="1.7777778">16:9</option><option value="0.8">4:5</option></select></label>
      <img src={source} alt={t("Crop preview")} className="max-h-56 w-full object-cover" style={{ aspectRatio: ratio === "original" ? undefined : ratio, objectPosition: focusX + "% " + focusY + "%" }} />
      <label>{t("Horizontal focus")}<input aria-label={t("Horizontal crop focus")} type="range" value={focusX} onChange={(e) => setFocusX(Number(e.target.value))} /></label><label>{t("Vertical focus")}<input aria-label={t("Vertical crop focus")} type="range" value={focusY} onChange={(e) => setFocusY(Number(e.target.value))} /></label><button disabled={busy} onClick={() => void upload()}>{busy ? t("Uploading…") : t("Upload cropped image")}</button></div>}
    <p>{t("Choose an existing library image for this slot and variant. Changes become public only after publication.")}</p>
    <div className="grid grid-cols-4 gap-2">{assets.map((asset) => <button key={asset.id} type="button" onClick={() => assign(asset)} title={asset.id}>
      <img src={asset.url} alt={asset.id} className="aspect-square w-full object-cover" /><span className="text-xs">{asset.width} × {asset.height}</span>
    </button>)}</div><button disabled={page === 1} onClick={() => setPage(page - 1)}>{t("Previous media")}</button> <button disabled={page === lastPage} onClick={() => setPage(page + 1)}>{t("Next media")}</button>
    <button onClick={() => cms.updateField("media." + slot, { ...media, [variant + "_asset_id"]: null, [variant + "_url"]: null })}>{t("Clear variant")}</button>
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}
export function MerchantCmsControls() {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const t = (text: string) => merchantCmsText(locale, text);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("sections");
  const [versions, setVersions] = useState<Awaited<ReturnType<typeof fetchMerchantLandingVersions>>>([]);
  const [version, setVersion] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (!open || tab !== "history") return; let cancelled = false; queueMicrotask(() => { if (!cancelled) { setVersion(""); setVersions([]); setError(""); } }); void fetchMerchantLandingVersions(locale, true).then((items) => { if (!cancelled) setVersions(items); }).catch((err) => { if (!cancelled) setError(merchantCmsError(locale, err, "Publications could not be loaded")); }); return () => { cancelled = true; }; }, [locale, open, tab]);
  const selected = versions.find((item) => item.id === version && item.locale === locale);
  const differences = selected?.content ? compareMerchantContent(merchantDraftPayload(cms.content), selected.content) : [];
  return <div className="mx-auto max-w-7xl">
    <button type="button" className="min-h-11 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-navy" onClick={() => setOpen(!open)} aria-expanded={open}>{t("Page settings, media & history")} {open ? "▾" : "▴"}</button>
    {open && <div className="my-3 max-h-[65vh] overflow-y-auto rounded border bg-slate-50 p-4">
      <div className="mb-4 flex flex-wrap gap-3">{["sections", "content", "media", "schedule", "history"].map((key) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{t(key)}</button>)}</div>
      <fieldset disabled={cms.saving || cms.loading || cms.mode === "preview"}>
        {tab === "sections" && cms.content.section_order.map((key, i, order) => <div key={key} className="flex gap-4 rounded border p-3" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const from = Number(e.dataTransfer.getData("text/plain")); if (!Number.isInteger(from) || from < 0 || from >= order.length) return; const next = [...order]; next.splice(i, 0, next.splice(from, 1)[0]); cms.updateField("section_order", next); }}>
          <label><input type="checkbox" checked={cms.content.section_visibility[key] !== false} onChange={(e) => cms.updateField("section_visibility." + key, e.target.checked)} /> {t(key)}</label>
          <button aria-label={t("Move") + " " + t(key) + " " + t("up")} disabled={i === 0} onClick={() => { const next = [...order]; [next[i-1], next[i]] = [next[i], next[i-1]]; cms.updateField("section_order", next); }}>↑</button><button aria-label={t("Move") + " " + t(key) + " " + t("down")} disabled={i === order.length - 1} onClick={() => { const next = [...order]; [next[i+1], next[i]] = [next[i], next[i+1]]; cms.updateField("section_order", next); }}>↓</button>
        </div>)}
        {tab === "content" && <div className="grid gap-4 md:grid-cols-2">{["title", "seo_title", "seo_description", "nav", ...SECTION_KEYS, "footer"].map((key) => { const value = cms.content[key as keyof typeof cms.content]; return <details key={key} className="rounded border p-3"><summary>{t(key)}</summary><Field path={key} value={key === "footer" ? { ...cms.content.footer, links: cms.content.footer.links ?? [] } : key === "platforms" ? { ...cms.content.platforms, tiles: cms.content.platforms.tiles.map((tile) => ({ ...tile, description: tile.description ?? "" })) } : value} /></details>; })}</div>}
        {tab === "media" && <MediaEditor />}
        {tab === "schedule" && <div className="space-y-3"><p>{t("Schedule uses your local time. Schedule publication keeps the current page live until the reviewed draft is published. Further draft saves make that schedule stale. Publish applies the visibility window immediately.")}</p>{["publish_at", "unpublish_at"].map((key) => { const date = cms.content.schedule?.[key as "publish_at" | "unpublish_at"]; const value = date ? new Date(new Date(date).getTime() - new Date(date).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""; return <label key={key} className="block">{t(key)}<input aria-label={t(key)} type="datetime-local" value={value} onChange={(e) => cms.updateField("schedule." + key, e.target.value ? new Date(e.target.value).toISOString() : null)} /></label>; })}<button disabled={!cms.content.schedule?.publish_at} onClick={() => void cms.schedulePublication(cms.content.schedule!.publish_at!)}>{t("Schedule publication")}</button><p>{t("Pending schedules and cancellation are available in")} <a className="underline" href="/admin/cms">{t("Content Studio")}</a>.</p></div>}
        {tab === "history" && <div className="space-y-3"><p>{t("Restoring publishes the selected earlier version immediately. Current unsaved edits will be discarded.")}</p><select aria-label={t("Published version")} value={version} onChange={(e) => setVersion(e.target.value)}><option value="">{t("Choose a publication")}</option>{versions.filter((item) => item.locale === locale).map((item) => <option key={item.id} value={item.id}>{t("Version")} {item.number} · {new Date(item.published_at).toLocaleString(locale)} · {item.locale}</option>)}</select>{selected && <section aria-label={t("Compare before restoring")} className="space-y-3">
          <h3 className="font-bold">{t("Compare before restoring")}</h3>
          {!selected.content ? <p role="alert">{t("Comparison unavailable for this publication.")}</p> : differences.length === 0 ? <p>{t("No differences from the current draft.")}</p> : <div className="overflow-x-auto"><table className="w-full table-fixed border-collapse text-left text-sm">
            <thead><tr>{["Field", "Current draft", "Selected publication"].map((label) => <th key={label} className="border p-2">{t(label)}</th>)}</tr></thead>
            <tbody>{differences.map((row) => <tr key={row.path}><th className="break-words border p-2">{row.path.split(".").map((part) => /^\d+$/.test(part) ? String(Number(part) + 1) : t(part)).join(" / ")}</th><td className="whitespace-pre-wrap break-words border p-2">{row.current}</td><td className="whitespace-pre-wrap break-words border p-2">{row.selected}</td></tr>)}</tbody>
          </table></div>}
        </section>}<button disabled={!selected?.content} onClick={() => selected && void cms.restoreVersion(selected.id)}>{t("Restore selected publication")}</button>{error && <p role="alert">{error}</p>}</div>}
      </fieldset>
    </div>}
  </div>;
}
