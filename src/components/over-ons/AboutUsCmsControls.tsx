"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { fetchAboutUsVersions } from "@/lib/aboutUs";
import { SECTION_KEYS } from "@/lib/aboutUsDefaults";
import { aboutUsCmsText } from "@/i18n/aboutUsCmsCopy";
import { merchantCmsError } from "@/i18n/merchantCmsCopy";
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
  const { locale } = useLocale();
  const t = (text: string, params?: Record<string, string | number>) => aboutUsCmsText(locale, text, params);
  const label = path.split(".").at(-1)!;
  const fieldLabel = path.split(".").map((part) => /^\d+$/.test(part) ? String(Number(part) + 1) : t(part)).join(" / ");
  if (/(?:_url|_asset_id|_percent)$/.test(label)) return null;
  if (Array.isArray(value)) {
    const move = (from: number, to: number) => {
      if (to < 0 || to >= value.length) return;
      const next = [...value]; next.splice(to, 0, next.splice(from, 1)[0]); cms.updateField(path, next);
    };
    return <fieldset className="space-y-2 rounded border p-3"><legend>{fieldLabel}</legend>
      {value.map((item, i) => <div key={i} className="rounded border p-2">
        <div className="flex gap-3"><span>{t("Item")} {i + 1}</span>
          <button type="button" aria-label={t("Move {field} {number} up", { field: fieldLabel, number: i + 1 })} disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
          <button type="button" aria-label={t("Move {field} {number} down", { field: fieldLabel, number: i + 1 })} disabled={i === value.length - 1} onClick={() => move(i, i + 1)}>↓</button>
          <button type="button" onClick={() => cms.updateField(path, value.filter((_, index) => i !== index))}>{t("Remove")}</button></div>
        <Field path={`${path}.${i}`} value={item} />
      </div>)}
      {templates[path] !== undefined && <button type="button" onClick={() => cms.updateField(path, [...value, localizeTemplate(templates[path], t)])}>{t("Add {field}", { field: t(label) })}</button>}
    </fieldset>;
  }
  if (value && typeof value === "object") return <div className="space-y-2">{Object.entries(value).map(([key, item]) => <Field key={key} path={`${path}.${key}`} value={item} />)}</div>;
  if (typeof value === "boolean") return <label className="flex gap-2"><input aria-label={fieldLabel} data-cms-field={path} type="checkbox" checked={value} onChange={(e) => cms.updateField(path, e.target.checked)} />{t(label)}</label>;
  return <label className="block text-xs font-semibold">{fieldLabel}
    {label === "icon" ? <select aria-label={fieldLabel} data-cms-field={path} className={inputClass} value={String(value)} onChange={(e) => cms.updateField(path, e.target.value)}>{["tag", "shop", "users"].map((icon) => <option key={icon} value={icon}>{t(icon)}</option>)}</select>
      : <textarea aria-label={fieldLabel} data-cms-field={path} rows={/description|bio|intro/.test(label) ? 3 : 1} className={inputClass} value={String(value ?? "")} onChange={(e) => cms.updateField(path, e.target.value)} />}
  </label>;
}

function localizeTemplate(value: unknown, t: (text: string) => string): unknown {
  if (typeof value === "string") return value.startsWith("New ") || value === "Description" ? t(value) : value;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeTemplate(item, t)]));
  return value;
}

type Asset = { id: string; url: string };
function MediaEditor() {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const t = (text: string, params?: Record<string, string | number>) => aboutUsCmsText(locale, text, params);
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
        if (!context) throw new Error(t("Image cropping is unavailable"));
        context.drawImage(bitmap, (bitmap.width - width) * x / 100, (bitmap.height - height) * y / 100, width, height, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error(t("Crop failed"))), "image/webp", 0.9));
        const form = new FormData(); form.append("image", blob, "about-image.webp");
        const res = await apiRequest<{ data: Asset }>({ path: "/api/v1/admin/content/over-ons/assets", method: "POST", body: form });
        setUploaded(res.data);
      } finally { bitmap.close(); }
    } catch (err) { setError(merchantCmsError(locale, err, "Upload failed")); }
    finally { setBusy(false); }
  };
  return <fieldset disabled={busy} className="space-y-3">
    <p>{t("Use approved company photography. Upload creates an asset; Apply image adds it to this draft.")}</p>
    <label className="block">{t("Image slot")}<select aria-label={t("Image slot")} value={slot} onChange={(e) => { setSlot(e.target.value); setUploaded(null); }}>
      {["hero", "story", "team", "seo"].map((key) => <option key={key} value={key}>{t(key)}</option>)}
      {cms.content.team.profiles.map((profile, i) => <option key={i} value={`profile.${i}`}>{t("Profile {number}: {name}", { number: i + 1, name: profile.name })}</option>)}
    </select></label>
    {!slot.startsWith("profile.") && slot !== "seo" && <><label>{t("Variant")}<select aria-label={t("Image variant")} value={variant} onChange={(e) => { setVariant(e.target.value); setUploaded(null); }}><option value="desktop">{t("desktop")}</option><option value="mobile">{t("mobile")}</option></select></label>
      <label className="block">{t("Alternative text")}<input aria-label={t("Image alternative text")} className={inputClass} value={media.alt} onChange={(e) => cms.updateField(`media.${slot}`, { ...media, alt: e.target.value })} /></label></>}
    <input aria-label={t("Replace image")} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploaded(null); }} />
    {file && source && <><label className="block">{t("Crop")}<select aria-label={t("Crop ratio")} value={ratio} onChange={(e) => { setRatio(e.target.value); setUploaded(null); }}><option value="original">{t("Original")}</option><option value="1">{t("Square")}</option><option value="1.7777778">16:9</option><option value="0.8">4:5</option></select></label>
      <img src={source} alt={t("Crop preview")} className="max-h-56 w-64 object-cover" style={{ aspectRatio: ratio === "original" ? undefined : ratio, objectPosition: `${x}% ${y}%` }} />
      <label>{t("Horizontal focus")}<input aria-label={t("Horizontal crop focus")} type="range" min="0" max="100" value={x} onChange={(e) => { setX(Number(e.target.value)); setUploaded(null); }} /></label>
      <label>{t("Vertical focus")}<input aria-label={t("Vertical crop focus")} type="range" min="0" max="100" value={y} onChange={(e) => { setY(Number(e.target.value)); setUploaded(null); }} /></label>
      <button type="button" onClick={() => void upload()}>{t("Upload cropped image")}</button></>}
    {uploaded && <button type="button" onClick={() => {
      if (["hero", "story", "team"].includes(slot)) cms.updateField(`media.${slot}`, { ...media, [`${variant}_asset_id`]: uploaded.id, [`${variant}_url`]: uploaded.url });
      else { cms.updateField(idPath, uploaded.id); cms.updateField(urlPath, uploaded.url); }
      setUploaded(null); setFile(null);
    }}>{t("Apply image")}</button>}
    <button type="button" onClick={() => {
      if (["hero", "story", "team"].includes(slot)) {
        const other = variant === "mobile" ? "desktop" : "mobile";
        if (!media[`${other}_asset_id` as "desktop_asset_id" | "mobile_asset_id"]) {
          const next = { ...cms.content.media }; delete next[slot as "hero" | "story" | "team"]; cms.updateField("media", next);
        } else cms.updateField(`media.${slot}`, { ...media, [`${variant}_asset_id`]: null, [`${variant}_url`]: null });
        cms.updateField(`${slot}.image_asset_id`, null); cms.updateField(`${slot}.image_url`, null);
      } else { cms.updateField(idPath, null); cms.updateField(urlPath, null); }
    }}>{t("Clear image")}</button>
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => Object.entries(flatten(item, prefix ? `${prefix}.${key}` : key))));
  return /_url$|_percent$/.test(prefix) ? {} : { [prefix]: String(value ?? "") };
}

export function AboutUsCmsControls() {
  const cms = useInlineCms();
  const { locale, intlLocale } = useLocale();
  const t = (text: string, params?: Record<string, string | number>) => aboutUsCmsText(locale, text, params);
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
    void fetchAboutUsVersions(locale).then((items) => { if (!cancelled) setVersions(items); }).catch((err) => { if (!cancelled) setError(merchantCmsError(locale, err, "Publications could not be loaded")); });
    return () => { cancelled = true; };
  }, [open, tab, locale]);
  const selected = versions.find((item) => item.id === version && item.locale === locale);
  const current = flatten(cms.content), historical = flatten(selected?.content);
  const differences = [...new Set([...Object.keys(current), ...Object.keys(historical)])].filter((key) => current[key] !== historical[key]);
  return <div className="mx-auto max-w-7xl">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>{t("Page settings, media & history")}</button>
    {open && <div className="my-3 max-h-[60vh] overflow-y-auto rounded border bg-slate-50 p-4">
      <div className="mb-4 flex flex-wrap gap-4">{["content", "sections", "media", "schedule", "history"].map((key) => <button key={key} type="button" aria-pressed={key === tab} onClick={() => setTab(key)}>{t(key)}</button>)}</div>
      <fieldset disabled={cms.saving || cms.loading || cms.mode === "preview"}>
        {tab === "content" && <div className="grid gap-3 md:grid-cols-2">
          <p className="md:col-span-2">{t("Company details and team profiles must be verified before publication. SEO fields also control Open Graph previews.")}</p>
          {["title", "seo_title", "seo_description", "nav", ...SECTION_KEYS, "footer"].map((key) => <details key={key} className="rounded border p-3"><summary>{t(key)}</summary><Field path={key} value={cms.content[key as keyof typeof cms.content]} /></details>)}
        </div>}
        {tab === "sections" && cms.content.section_order.map((key, i, order) => <div key={key} className="flex gap-4 border p-3">
          <label><input aria-label={t("Show {field}", { field: t(key) })} type="checkbox" checked={cms.content.section_visibility[key] !== false} onChange={(e) => cms.updateField(`section_visibility.${key}`, e.target.checked)} />{t(key)}</label>
          {[-1, 1].map((direction) => <button key={direction} type="button" aria-label={t(direction === -1 ? "Move {field} up" : "Move {field} down", { field: t(key) })} disabled={i + direction < 0 || i + direction >= order.length} onClick={() => { const next = [...order]; [next[i], next[i + direction]] = [next[i + direction], next[i]]; cms.updateField("section_order", next); }}>{direction === -1 ? "↑" : "↓"}</button>)}
        </div>)}
        {tab === "media" && <MediaEditor />}
        {tab === "schedule" && <div className="space-y-3"><p>{t("Times use your browser timezone. Scheduling keeps the current publication live until the reviewed draft is published. Later draft saves make that schedule stale.")}</p>
          {(["publish_at", "unpublish_at"] as const).map((key) => {
            const date = cms.content.schedule?.[key];
            const value = date && !Number.isNaN(Date.parse(date)) ? new Date(new Date(date).getTime() - new Date(date).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
            return <label key={key} className="block">{t(key)}<input aria-label={t(key)} type="datetime-local" value={value} onChange={(e) => cms.updateField(`schedule.${key}`, e.target.value ? new Date(e.target.value).toISOString() : null)} /></label>;
          })}
          <button type="button" disabled={!cms.content.schedule?.publish_at} onClick={() => void cms.schedulePublication(cms.content.schedule!.publish_at!)}>{t("Schedule publication")}</button>
          <a className="block underline" href="/admin/cms">{t("Manage or cancel pending schedules in Content Studio")}</a>
        </div>}
        {tab === "history" && <div className="space-y-3"><p>{t("Select a historical publication and review its differences against the current draft. Restoration publishes immediately and discards unsaved edits.")}</p>
          <select aria-label={t("Published version")} value={version} onChange={(e) => { setVersion(e.target.value); setConfirm(false); }}><option value="">{t("Choose a publication")}</option>{versions.filter((item) => item.locale === locale).map((item) => <option key={item.id} value={item.id}>{t("Version")} {item.number} · {new Date(item.published_at).toLocaleString(intlLocale)} · {item.locale}</option>)}</select>
          {selected && <><table className="w-full text-left text-xs"><caption>{t("Version {number} compared with current draft", { number: selected.number })}</caption><thead><tr><th>{t("Field")}</th><th>{t("Current draft")}</th><th>{t("Selected publication")}</th></tr></thead><tbody>{differences.map((key) => <tr key={key}><th className="p-2">{key.split(".").map((part) => /^\d+$/.test(part) ? String(Number(part) + 1) : t(part)).join(" / ")}</th><td className="p-2">{current[key] ?? "—"}</td><td className="p-2">{historical[key] ?? "—"}</td></tr>)}</tbody></table>
            {!differences.length && <p>{t("No differences.")}</p>}
            <label className="block"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> {t("Publish version {number} ({locale}) immediately", { number: selected.number, locale: selected.locale })}</label>
            <button type="button" disabled={!confirm} onClick={() => void cms.restoreVersion(selected.id)}>{t("Restore selected publication")}</button></>}
          {error && <p role="alert">{error}</p>}
        </div>}
      </fieldset>
    </div>}
  </div>;
}
