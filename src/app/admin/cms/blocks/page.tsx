"use client";

import { useState } from "react";
import AdminListPage from "@/components/AdminListPage";
import RichTextEditor from "@/components/cms/RichTextEditor";
import RichTextView from "@/components/cms/RichTextView";
import { useLocale } from "@/i18n/LocaleContext";
import { confirmPassword } from "@/lib/profile";
import { ApiError } from "@/lib/api";
import { listCmsPages, previewCmsDraft, type CmsPageSummary } from "@/lib/cms";
import { getSharedBlock, getSharedUsages, listSharedBlocks, mountSharedBlock, saveSharedBlock, sharedPreview, sharedTextFields, type SharedBlock, type SharedUsage, type SharedVersion } from "@/lib/cmsSharedBlocks";
import { emptyDoc, type RichDoc } from "@/lib/richText";

const control = "rounded-lg border border-blue-200 bg-white p-2";
export default function SharedBlocksPage() {
  const { locale } = useLocale();
  return <SharedBlocksWorkspace key={locale} />;
}
function SharedBlocksWorkspace() {
  const { locale, dictionary } = useLocale();
  const t = (nl: string, en: string, de: string) => ({ nl, en, de })[locale];
  const [blocks, setBlocks] = useState<SharedBlock[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [block, setBlock] = useState<SharedBlock | null>(null);
  const [versions, setVersions] = useState<SharedVersion[]>([]);
  const [versionNext, setVersionNext] = useState<number | null>(null);
  const [selected, setSelected] = useState<SharedVersion>();
  const [key, setKey] = useState("");
  const [doc, setDoc] = useState<RichDoc>(emptyDoc());
  const [pages, setPages] = useState<CmsPageSummary[]>([]);
  const [target, setTarget] = useState<{ id: string; revision: number; body: RichDoc }>();
  const [index, setIndex] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [usage, setUsage] = useState<{ source: "draft" | "revision"; rows: SharedUsage[]; next: number | null }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (err) {
      if (err instanceof ApiError && err.code === "password_confirmation_required") setPasswordRequired(true);
      setError(err instanceof Error ? err.message : dictionary.errorGeneric);
    } finally { setBusy(false); }
  }
  async function load(after?: string) {
    const response = await listSharedBlocks(locale, after);
    setBlocks(current => after ? [...current, ...response.data] : response.data); setNext(response.next);
  }
  async function open(id: string, after?: number) {
    const response = await getSharedBlock(id, locale, after);
    setBlock(response.data); setVersions(current => after === undefined ? response.data.versions : [...current, ...response.data.versions]); setVersionNext(response.next);
    if (after === undefined) { setSelected(undefined); setOverrides({}); setUsage(undefined); setDoc(emptyDoc()); }
  }
  async function scan(source: "draft" | "revision", after?: number) {
    if (!block) return;
    const response = await getSharedUsages(block.id, source, locale, after);
    setUsage(current => ({ source, rows: after === undefined ? response.data : [...(current?.rows ?? []), ...response.data], next: response.scan.next }));
  }
  async function loadTarget(id: string) {
    setTarget(undefined); setIndex("");
    const response = await previewCmsDraft(id, locale);
    setTarget({ id, revision: response.draft_revision, body: response.content.body });
  }
  return <AdminListPage title={t("Gedeelde blokken", "Shared blocks", "Gemeinsame Blöcke")} accent="cms" backHref="/admin/cms">
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {passwordRequired && <form onSubmit={event => {
      event.preventDefault(); const form = event.currentTarget; const password = String(new FormData(form).get("password") ?? ""); form.reset();
      void run(async () => { await confirmPassword(password, locale); setPasswordRequired(false); setNotice(t("Herhaal je actie.", "Retry your action.", "Wiederhole die Aktion.")); });
    }}><input aria-label={t("Huidig wachtwoord", "Current password", "Aktuelles Passwort")} name="password" type="password" autoComplete="current-password" required /><button disabled={busy}>{t("Bevestigen", "Confirm", "Bestätigen")}</button></form>}
    <fieldset disabled={busy} className="space-y-5">
      <button className={control} onClick={() => void run(() => load())}>{t("Blokken laden", "Load blocks", "Blöcke laden")}</button>
      <ul>{blocks.map(row => <li key={row.id}><button className={control} onClick={() => void run(() => open(row.id))}>{row.key} · v{row.revision}</button></li>)}</ul>
      {next && <button onClick={() => void run(() => load(next))}>{t("Meer laden", "Load more", "Mehr laden")}</button>}
      <button className={control} onClick={() => { setBlock(null); setVersions([]); setSelected(undefined); setDoc(emptyDoc()); setKey(""); setUsage(undefined); }}>{t("Nieuw blok", "New block", "Neuer Block")}</button>
      <section className="space-y-3 rounded border p-4">
        <h2>{block?.key ?? t("Nieuw blok", "New block", "Neuer Block")}</h2>
        {!block && <label>{t("Sleutel", "Key", "Schlüssel")}<input className={control} value={key} onChange={event => setKey(event.target.value)} /></label>}
        <p>{t("Eén tekstblok per versie; wijzigingen worden expliciet in concepten geplaatst.", "One text block per version; changes are explicitly mounted into drafts.", "Ein Textblock pro Version; Änderungen werden ausdrücklich in Entwürfe eingefügt.")}</p>
        <RichTextEditor value={doc} onChange={setDoc} />
        <button className={control} disabled={doc.content.length !== 1 || (!block && !/^[a-z][a-z0-9-]{0,79}$/.test(key))} onClick={() => void run(async () => {
          const response = await saveSharedBlock(block, key, doc.content[0], locale);
          await open(response.data.block_id); await load(); setSelected(response.data); setDoc({ type: "doc", content: [response.data.node] });
        })}>{t("Nieuwe versie opslaan", "Save new version", "Neue Version speichern")}</button>
        <ul>{versions.map(version => <li key={version.id}><button className={control} aria-pressed={selected?.id === version.id} onClick={() => { setSelected(version); setDoc({ type: "doc", content: [version.node] }); setOverrides({}); }}>v{version.number} · {version.locale}</button></li>)}</ul>
        {versionNext !== null && block && <button onClick={() => void run(() => open(block.id, versionNext))}>{t("Meer versies", "More versions", "Weitere Versionen")}</button>}
      </section>
      {block && <section><h2>{t("Gebruik", "Usage", "Verwendung")}</h2>{(["draft", "revision"] as const).map(source => <button key={source} className={control} onClick={() => void run(() => scan(source))}>{source === "draft" ? t("Concepten scannen", "Scan drafts", "Entwürfe durchsuchen") : t("Revisies scannen", "Scan revisions", "Versionen durchsuchen")}</button>)}
        <ul>{usage?.rows.map(row => <li key={row.source.page_id + row.source.locale + row.source.version.id}>{row.source.page_key} · {row.source.locale} · {row.usages.map(item => item.path).join(", ")}</li>)}</ul>
        {usage?.next !== null && usage?.next !== undefined && <button onClick={() => void run(() => scan(usage.source, usage.next!))}>{t("Verder scannen", "Continue scan", "Suche fortsetzen")}</button>}
      </section>}
      {selected && <section className="space-y-3 rounded border p-4">
        <h2>{t("In concept plaatsen", "Mount into draft", "In Entwurf einfügen")}</h2>
        <button className={control} onClick={() => void run(async () => { setPages((await listCmsPages({ locale })).filter(page => !page.archived && page.locales[locale])); })}>{t("Pagina’s laden", "Load pages", "Seiten laden")}</button>
        <select aria-label={t("Doelpagina", "Target page", "Zielseite")} className={control} value={target?.id ?? ""} onChange={event => { const id = event.target.value; if (id) void run(() => loadTarget(id)); else setTarget(undefined); }}><option value="">—</option>{pages.map(page => <option key={page.id} value={page.id}>{page.key}</option>)}</select>
        {target && <><select aria-label={t("Positie", "Position", "Position")} className={control} value={index} onChange={event => setIndex(event.target.value)}><option value="">{t("Toevoegen", "Append", "Anhängen")}</option>{target.body.content.map((node, i) => <option key={i} value={i}>{i + 1} · {node.type}</option>)}</select>
          {sharedTextFields(selected.node).map(field => <label key={field.path} className="block">{field.path}<input className={control} value={overrides[field.path] ?? field.text} onChange={event => setOverrides(current => ({ ...current, [field.path]: event.target.value }))} /></label>)}
          <RichTextView doc={{ type: "doc", content: [sharedPreview(selected.node, overrides)] }} />
          <button className={control} onClick={() => void run(async () => { await mountSharedBlock(target.id, locale, target.revision, selected.id, index === "" ? null : Number(index), overrides); await loadTarget(target.id); setNotice(t("Concept bijgewerkt.", "Draft updated.", "Entwurf aktualisiert.")); })}>{t("Versie met lokale tekst plaatsen", "Mount version with local text", "Version mit lokalem Text einfügen")}</button>
          <button className={control} disabled={index === ""} onClick={() => void run(async () => { await mountSharedBlock(target.id, locale, target.revision, null, Number(index), {}); await loadTarget(target.id); setNotice(t("Blok losgekoppeld.", "Block detached.", "Block gelöst.")); })}>{t("Geselecteerd blok loskoppelen", "Detach selected block", "Ausgewählten Block lösen")}</button>
        </>}
      </section>}
    </fieldset>
  </AdminListPage>;
}
