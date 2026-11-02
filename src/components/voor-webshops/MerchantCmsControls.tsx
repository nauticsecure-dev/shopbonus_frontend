"use client";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { fetchMerchantLandingVersions } from "@/lib/merchantLanding";
import { useLocale } from "@/i18n/LocaleContext";
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
function Field({ path, value }: { path: string; value: unknown }) {
  const cms = useInlineCms();
  const label = path.split(".").at(-1)!;
  const normalized = path.split(".").filter((part) => !/^\d+$/.test(part)).join(".");
  if (/(url|asset_id|connectable|blocked_reason|status)$/.test(label)) return null;
  if (Array.isArray(value)) {
    const move = (from: number, to: number) => { if (to < 0 || to >= value.length) return; const next = [...value]; next.splice(to, 0, next.splice(from, 1)[0]); cms.updateField(path, next); };
    return <fieldset className="space-y-2 rounded border p-3"><legend>{label}</legend>{value.map((item, i) => <div key={i} className="rounded border p-2" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", path + ":" + i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const [source, index] = e.dataTransfer.getData("text/plain").split(":"); if (source === path) move(Number(index), i); }}>
      <div className="flex gap-3"><span>Item {i + 1}</span><button type="button" aria-label={"Move " + path + " " + (i + 1) + " up"} onClick={() => move(i, i - 1)}>↑</button><button type="button" aria-label={"Move " + path + " " + (i + 1) + " down"} onClick={() => move(i, i + 1)}>↓</button><button type="button" onClick={() => cms.updateField(path, value.filter((_, index) => index !== i))}>Remove</button></div>
      <Field path={path + "." + i} value={item} />
    </div>)}{templates[path] !== undefined && <button type="button" onClick={() => cms.updateField(path, [...value, structuredClone(templates[path])])}>Add {label}</button>}</fieldset>;
  }
  if (value && typeof value === "object") return <div className="space-y-2">{Object.entries(value).map(([key, item]) => <Field key={key} path={path + "." + key} value={item} />)}</div>;
  if (typeof value === "boolean") return <label className="flex gap-2"><input type="checkbox" checked={value} onChange={(e) => cms.updateField(path, e.target.checked)} />{label}</label>;
  const options = choices[normalized];
  return <label className="block text-xs font-semibold">{label}{options ? <select aria-label={path} className={inputClass} value={String(value ?? "")} onChange={(e) => cms.updateField(path, e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select> : <textarea aria-label={path} rows={label.includes("description") || label === "answer" ? 3 : 1} className={inputClass} value={String(value ?? "")} onChange={(e) => cms.updateField(path, e.target.value)} />}</label>;
}

function MediaEditor() {
  const cms = useInlineCms();
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
    void apiRequest<{ data: Asset[]; meta: { last_page: number } }>({ path: "/api/v1/admin/content/voor-webshops/assets?page=" + page, cache: "no-store" }).then((res) => { if (!cancelled) { setAssets(res.data); setLastPage(res.meta.last_page); } }).catch((err) => { if (!cancelled) setError(String(err)); });
    return () => { cancelled = true; };
  }, [page, reload]);
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
        if (!context) throw new Error("Image cropping is unavailable");
        context.drawImage(bitmap, (bitmap.width - width) * focusX / 100, (bitmap.height - height) * focusY / 100, width, height, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Crop failed")), "image/webp", 0.9));
        const form = new FormData(); form.append("image", blob, "merchant-image.webp");
        const res = await apiRequest<{ data: Asset }>({ path: "/api/v1/admin/content/voor-webshops/assets", method: "POST", body: form });
        setUploaded({ slot, variant, asset: res.data }); setReload((value) => value + 1); setFile(null);
      } finally { bitmap.close(); }
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setBusy(false); }
  };
  return <fieldset disabled={busy} className="space-y-3">
    <div className="flex gap-3"><label>Image slot<select aria-label="Image slot" value={slot} onChange={(e) => setSlot(e.target.value as typeof slot)}>{["hero_background", "hero", "benefits", "offers"].map((key) => <option key={key}>{key}</option>)}</select></label><label>Variant<select aria-label="Image variant" value={variant} onChange={(e) => setVariant(e.target.value as typeof variant)}><option>desktop</option><option>mobile</option></select></label></div>
    <label className="block">Alternative text<input className={inputClass} value={media.alt} onChange={(e) => cms.updateField("media." + slot, { ...media, alt: e.target.value })} /></label>
    <input aria-label="Replace image" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
    {source && <div className="space-y-2"><label>Crop<select aria-label="Crop ratio" value={ratio} onChange={(e) => setRatio(e.target.value)}><option value="original">Original</option><option value="1">Square</option><option value="1.7777778">16:9</option><option value="0.8">4:5</option></select></label>
      <img src={source} alt="Crop preview" className="max-h-56 w-full object-cover" style={{ aspectRatio: ratio === "original" ? undefined : ratio, objectPosition: focusX + "% " + focusY + "%" }} />
      <label>Horizontal focus<input aria-label="Horizontal crop focus" type="range" value={focusX} onChange={(e) => setFocusX(Number(e.target.value))} /></label><label>Vertical focus<input aria-label="Vertical crop focus" type="range" value={focusY} onChange={(e) => setFocusY(Number(e.target.value))} /></label><button disabled={busy} onClick={() => void upload()}>{busy ? "Uploading…" : "Upload cropped image"}</button></div>}
    <p>Choose an existing library image for this slot and variant. Changes become public only after publication.</p>
    <div className="grid grid-cols-4 gap-2">{assets.map((asset) => <button key={asset.id} type="button" onClick={() => assign(asset)} title={asset.id}>
      <img src={asset.url} alt={asset.id} className="aspect-square w-full object-cover" /><span className="text-xs">{asset.width} × {asset.height}</span>
    </button>)}</div><button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous media</button> <button disabled={page === lastPage} onClick={() => setPage(page + 1)}>Next media</button>
    <button onClick={() => cms.updateField("media." + slot, { ...media, [variant + "_asset_id"]: null, [variant + "_url"]: null })}>Clear variant</button>
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}
export function MerchantCmsControls() {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("sections");
  const [versions, setVersions] = useState<Awaited<ReturnType<typeof fetchMerchantLandingVersions>>>([]);
  const [version, setVersion] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (!open || tab !== "history") return; let cancelled = false; queueMicrotask(() => { if (!cancelled) setVersion(""); }); void fetchMerchantLandingVersions(locale).then((items) => { if (!cancelled) setVersions(items); }).catch((err) => { if (!cancelled) setError(String(err)); }); return () => { cancelled = true; }; }, [locale, open, tab]);
  return <div className="mx-auto max-w-7xl">
    <button type="button" className="min-h-11 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-navy" onClick={() => setOpen(!open)} aria-expanded={open}>Page settings, media & history {open ? "▾" : "▴"}</button>
    {open && <div className="my-3 max-h-[65vh] overflow-y-auto rounded border bg-slate-50 p-4">
      <div className="mb-4 flex flex-wrap gap-3">{["sections", "content", "media", "schedule", "history"].map((key) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{key}</button>)}</div>
      <fieldset disabled={cms.saving || cms.loading || cms.mode === "preview"}>
        {tab === "sections" && cms.content.section_order.map((key, i, order) => <div key={key} className="flex gap-4 rounded border p-3" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const from = Number(e.dataTransfer.getData("text/plain")); if (!Number.isInteger(from) || from < 0 || from >= order.length) return; const next = [...order]; next.splice(i, 0, next.splice(from, 1)[0]); cms.updateField("section_order", next); }}>
          <label><input type="checkbox" checked={cms.content.section_visibility[key] !== false} onChange={(e) => cms.updateField("section_visibility." + key, e.target.checked)} /> {key}</label>
          <button aria-label={"Move " + key + " up"} disabled={i === 0} onClick={() => { const next = [...order]; [next[i-1], next[i]] = [next[i], next[i-1]]; cms.updateField("section_order", next); }}>↑</button><button aria-label={"Move " + key + " down"} disabled={i === order.length - 1} onClick={() => { const next = [...order]; [next[i+1], next[i]] = [next[i], next[i+1]]; cms.updateField("section_order", next); }}>↓</button>
        </div>)}
        {tab === "content" && <div className="grid gap-4 md:grid-cols-2">{["title", "seo_title", "seo_description", "nav", ...SECTION_KEYS, "footer"].map((key) => { const value = cms.content[key as keyof typeof cms.content]; return <details key={key} className="rounded border p-3"><summary>{key}</summary><Field path={key} value={key === "footer" ? { ...cms.content.footer, links: cms.content.footer.links ?? [] } : key === "platforms" ? { ...cms.content.platforms, tiles: cms.content.platforms.tiles.map((tile) => ({ ...tile, description: tile.description ?? "" })) } : value} /></details>; })}</div>}
        {tab === "media" && <MediaEditor />}
        {tab === "schedule" && <div className="space-y-3"><p>Schedule uses your local time. Schedule publication keeps the current page live until the reviewed draft is published. Further draft saves make that schedule stale. Publish applies the visibility window immediately.</p>{["publish_at", "unpublish_at"].map((key) => { const date = cms.content.schedule?.[key as "publish_at" | "unpublish_at"]; const value = date ? new Date(new Date(date).getTime() - new Date(date).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""; return <label key={key} className="block">{key}<input aria-label={key} type="datetime-local" value={value} onChange={(e) => cms.updateField("schedule." + key, e.target.value ? new Date(e.target.value).toISOString() : null)} /></label>; })}<button disabled={!cms.content.schedule?.publish_at} onClick={() => void cms.schedulePublication(cms.content.schedule!.publish_at!)}>Schedule publication</button><p>Pending schedules and cancellation are available in <a className="underline" href="/admin/cms">Content Studio</a>.</p></div>}
        {tab === "history" && <div className="space-y-3"><p>Restoring publishes the selected earlier version immediately. Current unsaved edits will be discarded.</p><select aria-label="Published version" value={version} onChange={(e) => setVersion(e.target.value)}><option value="">Choose a publication</option>{versions.filter((item) => item.locale === locale).map((item) => <option key={item.id} value={item.id}>Version {item.number} · {new Date(item.published_at).toLocaleString()} · {item.locale}</option>)}</select><button disabled={!version} onClick={() => void cms.restoreVersion(version)}>Restore selected publication</button>{error && <p role="alert">{error}</p>}</div>}
      </fieldset>
    </div>}
  </div>;
}
