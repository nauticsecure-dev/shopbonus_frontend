"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { fetchAboutUsVersions } from "@/lib/aboutUs";
import { SECTION_KEYS } from "@/lib/aboutUsDefaults";
import { useLocale } from "@/i18n/LocaleContext";
import { useInlineCms } from "./AboutUsInlineCms";

const inputClass = "w-full rounded border border-blue-200 bg-white p-2 text-sm text-navy";
const templates: Record<string, unknown> = {
  "nav.links": { label: "New link", href: "/" },
  "contact.links": { label: "New link", href: "/support" },
  "story.paragraphs": "New paragraph",
  "values.items": { icon: "tag", title: "New value", description: "Description" },
  "team.profiles": { name: "", role: "", bio: "", linkedin_href: "", photo_asset_id: null },
};

function Field({ path, value }: { path: string; value: unknown }) {
  const cms = useInlineCms();
  const label = path.split(".").at(-1)!;
  if (/(?:_url|_asset_id|_percent)$/.test(label)) return null;
  if (Array.isArray(value)) {
    const move = (from: number, to: number) => {
      if (to < 0 || to >= value.length) return;
      const next = [...value]; next.splice(to, 0, next.splice(from, 1)[0]); cms.updateField(path, next);
    };
    return <fieldset className="space-y-2 rounded border p-3"><legend>{path}</legend>
      {value.map((item, i) => <div key={i} className="rounded border p-2">
        <div className="flex gap-3"><span>Item {i + 1}</span>
          <button type="button" aria-label={`Move ${path} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
          <button type="button" aria-label={`Move ${path} ${i + 1} down`} disabled={i === value.length - 1} onClick={() => move(i, i + 1)}>↓</button>
          <button type="button" onClick={() => cms.updateField(path, value.filter((_, index) => i !== index))}>Remove</button></div>
        <Field path={`${path}.${i}`} value={item} />
      </div>)}
      {templates[path] !== undefined && <button type="button" onClick={() => cms.updateField(path, [...value, structuredClone(templates[path])])}>Add {label}</button>}
    </fieldset>;
  }
  if (value && typeof value === "object") return <div className="space-y-2">{Object.entries(value).map(([key, item]) => <Field key={key} path={`${path}.${key}`} value={item} />)}</div>;
  if (typeof value === "boolean") return <label className="flex gap-2"><input aria-label={path} type="checkbox" checked={value} onChange={(e) => cms.updateField(path, e.target.checked)} />{label}</label>;
  return <label className="block text-xs font-semibold">{path}
    {label === "icon" ? <select aria-label={path} className={inputClass} value={String(value)} onChange={(e) => cms.updateField(path, e.target.value)}>{["tag", "shop", "users"].map((icon) => <option key={icon}>{icon}</option>)}</select>
      : <textarea aria-label={path} rows={/description|bio|intro/.test(label) ? 3 : 1} className={inputClass} value={String(value ?? "")} onChange={(e) => cms.updateField(path, e.target.value)} />}
  </label>;
}

type Asset = { id: string; url: string };
function MediaEditor() {
  const cms = useInlineCms();
  const [slot, setSlot] = useState("hero");
  const [variant, setVariant] = useState("desktop");
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [ratio, setRatio] = useState("original");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState<Asset | null>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setSource(url); });
    return () => { cancelled = true; URL.revokeObjectURL(url); };
  }, [file]);
  const media = cms.content.media?.[slot as "hero" | "story" | "team"] ?? { alt: "" };
  const urlPath = slot === "seo" ? "seo_image_url" : slot.startsWith("profile.") ? `team.profiles.${slot.split(".")[1]}.photo_url` : `media.${slot}.${variant}_url`;
  const idPath = slot === "seo" ? "seo_image_asset_id" : slot.startsWith("profile.") ? `team.profiles.${slot.split(".")[1]}.photo_asset_id` : `media.${slot}.${variant}_asset_id`;
  const upload = async () => {
    if (!file) return;
    setBusy(true); setError(""); setUploaded(null);
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const aspect = ratio === "original" ? bitmap.width / bitmap.height : Number(ratio);
        const width = Math.min(bitmap.width, bitmap.height * aspect), height = width / aspect;
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, (variant === "mobile" ? 768 : 1920) / width, 4000 / height);
        canvas.width = Math.max(16, Math.round(width * scale)); canvas.height = Math.max(16, Math.round(height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Image cropping unavailable");
        context.drawImage(bitmap, (bitmap.width - width) * x / 100, (bitmap.height - height) * y / 100, width, height, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Crop failed")), "image/webp", 0.9));
        const form = new FormData(); form.append("image", blob, "about-image.webp");
        const res = await apiRequest<{ data: Asset }>({ path: "/api/v1/admin/content/over-ons/assets", method: "POST", body: form });
        setUploaded(res.data);
      } finally { bitmap.close(); }
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setBusy(false); }
  };
  return <fieldset disabled={busy} className="space-y-3">
    <p>Use approved company photography. Upload creates an asset; Apply image adds it to this draft.</p>
    <label className="block">Image slot<select aria-label="Image slot" value={slot} onChange={(e) => { setSlot(e.target.value); setUploaded(null); }}>
      {["hero", "story", "team", "seo"].map((key) => <option key={key}>{key}</option>)}
      {cms.content.team.profiles.map((profile, i) => <option key={i} value={`profile.${i}`}>Profile {i + 1}: {profile.name}</option>)}
    </select></label>
    {!slot.startsWith("profile.") && slot !== "seo" && <><label>Variant<select aria-label="Image variant" value={variant} onChange={(e) => { setVariant(e.target.value); setUploaded(null); }}><option>desktop</option><option>mobile</option></select></label>
      <label className="block">Alternative text<input aria-label="Image alternative text" className={inputClass} value={media.alt} onChange={(e) => cms.updateField(`media.${slot}`, { ...media, alt: e.target.value })} /></label></>}
    <input aria-label="Replace image" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploaded(null); }} />
    {file && source && <><label className="block">Crop<select aria-label="Crop ratio" value={ratio} onChange={(e) => { setRatio(e.target.value); setUploaded(null); }}><option value="original">Original</option><option value="1">Square</option><option value="1.7777778">16:9</option><option value="0.8">4:5</option></select></label>
      <img src={source} alt="Crop preview" className="max-h-56 w-64 object-cover" style={{ aspectRatio: ratio === "original" ? undefined : ratio, objectPosition: `${x}% ${y}%` }} />
      <label>Horizontal focus<input aria-label="Horizontal crop focus" type="range" min="0" max="100" value={x} onChange={(e) => { setX(Number(e.target.value)); setUploaded(null); }} /></label>
      <label>Vertical focus<input aria-label="Vertical crop focus" type="range" min="0" max="100" value={y} onChange={(e) => { setY(Number(e.target.value)); setUploaded(null); }} /></label>
      <button type="button" onClick={() => void upload()}>Upload cropped image</button></>}
    {uploaded && <button type="button" onClick={() => {
      if (["hero", "story", "team"].includes(slot)) cms.updateField(`media.${slot}`, { ...media, [`${variant}_asset_id`]: uploaded.id, [`${variant}_url`]: uploaded.url });
      else { cms.updateField(idPath, uploaded.id); cms.updateField(urlPath, uploaded.url); }
      setUploaded(null); setFile(null);
    }}>Apply image</button>}
    <button type="button" onClick={() => {
      if (["hero", "story", "team"].includes(slot)) {
        const other = variant === "mobile" ? "desktop" : "mobile";
        if (!media[`${other}_asset_id` as "desktop_asset_id" | "mobile_asset_id"]) {
          const next = { ...cms.content.media }; delete next[slot as "hero" | "story" | "team"]; cms.updateField("media", next);
        } else cms.updateField(`media.${slot}`, { ...media, [`${variant}_asset_id`]: null, [`${variant}_url`]: null });
        cms.updateField(`${slot}.image_asset_id`, null); cms.updateField(`${slot}.image_url`, null);
      } else { cms.updateField(idPath, null); cms.updateField(urlPath, null); }
    }}>Clear image</button>
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => Object.entries(flatten(item, prefix ? `${prefix}.${key}` : key))));
  return /_url$|_percent$/.test(prefix) ? {} : { [prefix]: String(value ?? "") };
}

export function AboutUsCmsControls() {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("content");
  const [versions, setVersions] = useState<Awaited<ReturnType<typeof fetchAboutUsVersions>>>([]);
  const [version, setVersion] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open || tab !== "history") return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setVersion(""); setConfirm(false); setError(""); setVersions([]); } });
    void fetchAboutUsVersions(locale).then((items) => { if (!cancelled) setVersions(items); }).catch((err) => { if (!cancelled) setError(String(err)); });
    return () => { cancelled = true; };
  }, [open, tab, locale]);
  const selected = versions.find((item) => item.id === version && item.locale === locale);
  const current = flatten(cms.content), historical = flatten(selected?.content);
  const differences = [...new Set([...Object.keys(current), ...Object.keys(historical)])].filter((key) => current[key] !== historical[key]);
  return <div className="mx-auto max-w-7xl">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>Page settings, media & history</button>
    {open && <div className="my-3 max-h-[60vh] overflow-y-auto rounded border bg-slate-50 p-4">
      <div className="mb-4 flex flex-wrap gap-4">{["content", "sections", "media", "schedule", "history"].map((key) => <button key={key} type="button" aria-pressed={key === tab} onClick={() => setTab(key)}>{key}</button>)}</div>
      <fieldset disabled={cms.saving || cms.loading || cms.mode === "preview"}>
        {tab === "content" && <div className="grid gap-3 md:grid-cols-2">
          <p className="md:col-span-2">Company details and team profiles must be verified before publication. SEO fields also control Open Graph previews.</p>
          {["title", "seo_title", "seo_description", "nav", ...SECTION_KEYS, "footer"].map((key) => <details key={key} className="rounded border p-3"><summary>{key}</summary><Field path={key} value={cms.content[key as keyof typeof cms.content]} /></details>)}
        </div>}
        {tab === "sections" && cms.content.section_order.map((key, i, order) => <div key={key} className="flex gap-4 border p-3">
          <label><input aria-label={`Show ${key}`} type="checkbox" checked={cms.content.section_visibility[key] !== false} onChange={(e) => cms.updateField(`section_visibility.${key}`, e.target.checked)} />{key}</label>
          {[-1, 1].map((direction) => <button key={direction} type="button" aria-label={`Move ${key} ${direction === -1 ? "up" : "down"}`} disabled={i + direction < 0 || i + direction >= order.length} onClick={() => { const next = [...order]; [next[i], next[i + direction]] = [next[i + direction], next[i]]; cms.updateField("section_order", next); }}>{direction === -1 ? "↑" : "↓"}</button>)}
        </div>)}
        {tab === "media" && <MediaEditor />}
        {tab === "schedule" && <div className="space-y-3"><p>Times use your browser timezone. Scheduling keeps the current publication live until the reviewed draft is published. Later draft saves make that schedule stale.</p>
          {(["publish_at", "unpublish_at"] as const).map((key) => {
            const date = cms.content.schedule?.[key];
            const value = date && !Number.isNaN(Date.parse(date)) ? new Date(new Date(date).getTime() - new Date(date).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
            return <label key={key} className="block">{key}<input aria-label={key} type="datetime-local" value={value} onChange={(e) => cms.updateField(`schedule.${key}`, e.target.value ? new Date(e.target.value).toISOString() : null)} /></label>;
          })}
          <button type="button" disabled={!cms.content.schedule?.publish_at} onClick={() => void cms.schedulePublication(cms.content.schedule!.publish_at!)}>Schedule publication</button>
          <a className="block underline" href="/admin/cms">Manage or cancel pending schedules in Content Studio</a>
        </div>}
        {tab === "history" && <div className="space-y-3"><p>Select a historical publication and review its differences against the current draft. Restoration publishes immediately and discards unsaved edits.</p>
          <select aria-label="Published version" value={version} onChange={(e) => { setVersion(e.target.value); setConfirm(false); }}><option value="">Choose a publication</option>{versions.filter((item) => item.locale === locale).map((item) => <option key={item.id} value={item.id}>Version {item.number} · {new Date(item.published_at).toLocaleString()} · {item.locale}</option>)}</select>
          {selected && <><table className="w-full text-left text-xs"><caption>Version {selected.number} compared with current draft</caption><thead><tr><th>Field</th><th>Current draft</th><th>Selected publication</th></tr></thead><tbody>{differences.map((key) => <tr key={key}><th className="p-2">{key}</th><td className="p-2">{current[key] ?? "—"}</td><td className="p-2">{historical[key] ?? "—"}</td></tr>)}</tbody></table>
            {!differences.length && <p>No differences.</p>}
            <label className="block"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> Publish version {selected.number} ({selected.locale}) immediately</label>
            <button type="button" disabled={!confirm} onClick={() => void cms.restoreVersion(selected.id)}>Restore selected publication</button></>}
          {error && <p role="alert">{error}</p>}
        </div>}
      </fieldset>
    </div>}
  </div>;
}
