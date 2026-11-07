"use client";

import { useState } from "react";
import AdminListPage from "@/components/AdminListPage";
import RichTextView from "@/components/cms/RichTextView";
import { useLocale } from "@/i18n/LocaleContext";
import { ApiError, apiRequest } from "@/lib/api";
import { listCmsPages, previewCmsDraft, type CmsPageSummary } from "@/lib/cms";
import { confirmPassword } from "@/lib/profile";
import type { CmsPageContent } from "@/lib/richText";
import type { Locale } from "@/types/locale";

type Suggestion = { id: string; page: string; kind: string; source_locale: Locale; target_locale: Locale; source_revision: number; target_revision: number | null; status: string; error_code: string | null; proposed?: CmsPageContent | null; budget: { reserved_micros: number | null; estimated_micros: number | null; currency: string } };
const root = "/api/v1/admin/cms";
const control = "rounded border border-blue-200 bg-white p-2";
export default function CmsAiReviewPage() {
  const { locale } = useLocale();
  return <CmsAiReviewWorkspace key={locale} />;
}
function CmsAiReviewWorkspace() {
  const { locale, dictionary } = useLocale();
  const t = (nl: string, en: string, de: string) => ({ nl, en, de })[locale];
  const [pages, setPages] = useState<CmsPageSummary[]>([]);
  const [page, setPage] = useState("");
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Suggestion>();
  const [source, setSource] = useState<CmsPageContent>();
  const [reviewed, setReviewed] = useState(false);
  const [language, setLanguage] = useState(false);
  const [meaning, setMeaning] = useState(false);
  const [note, setNote] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: 6 }).format(value / 1000000);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (err) { if (err instanceof ApiError && err.code === "password_confirmation_required") setPasswordRequired(true); setError(err instanceof Error ? err.message : dictionary.errorGeneric); } finally { setBusy(false); }
  }
  async function list(id: string) { setRows((await apiRequest<{ data: Suggestion[] }>({ path: root + "/pages/" + encodeURIComponent(id) + "/suggestions", locale })).data); }
  async function open(id: string) {
    setSelected(undefined); setSource(undefined); setReviewed(false); setLanguage(false); setMeaning(false); setNote(""); setSlug("");
    const response = await apiRequest<{ data: Suggestion }>({ path: root + "/suggestions/" + encodeURIComponent(id), locale });
    const draft = await previewCmsDraft(response.data.page, response.data.source_locale);
    if (draft.draft_revision !== response.data.source_revision) throw new Error(t("Bron gewijzigd; maak een nieuw voorstel.", "Source changed; request a new proposal.", "Quelle geändert; fordere einen neuen Vorschlag an."));
    setSource(draft.content); setSelected(response.data);
  }
  return <AdminListPage title={t("AI-taalreview", "AI language review", "KI-Sprachprüfung")} accent="cms" backHref="/admin/cms">
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {passwordRequired && <form onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const password = String(new FormData(form).get("password") ?? ""); form.reset(); void run(async () => { await confirmPassword(password, locale); setPasswordRequired(false); }); }}><input name="password" type="password" aria-label={t("Huidig wachtwoord", "Current password", "Aktuelles Passwort")} autoComplete="current-password" required /><button disabled={busy}>{t("Bevestigen", "Confirm", "Bestätigen")}</button></form>}
    <fieldset disabled={busy} className="space-y-4">
      <button className={control} onClick={() => void run(async () => setPages(await listCmsPages({ locale })))}>{t("Pagina’s laden", "Load pages", "Seiten laden")}</button>
      <select className={control} aria-label={t("Pagina", "Page", "Seite")} value={page} onChange={event => { const id = event.target.value; setPage(id); setRows([]); setSelected(undefined); if (id) void run(() => list(id)); }}><option value="">—</option>{pages.map(row => <option key={row.id} value={row.id}>{row.key}</option>)}</select>
      {page && <button className={control} onClick={() => void run(() => list(page))}>{t("Status vernieuwen", "Refresh status", "Status aktualisieren")}</button>}
      <p>{t("De laatste 50 voorstellen per pagina. Kosten zijn reserveringen en schattingen, geen factuur of volledig dagbudget.", "Latest 50 proposals per page. Costs are reservations and estimates, not invoices or the complete daily budget.", "Die letzten 50 Vorschläge pro Seite. Kosten sind Reservierungen und Schätzungen, keine Rechnung und kein vollständiges Tagesbudget.")}</p>
      <ul>{rows.map(row => <li key={row.id}><button className={control} onClick={() => void run(() => open(row.id))}>{row.source_locale} → {row.target_locale} · {row.status} · {row.error_code ?? ""} · {t("Gereserveerd", "Reserved", "Reserviert")}: {money(row.budget.reserved_micros)} · {t("Geschat", "Estimated", "Geschätzt")}: {money(row.budget.estimated_micros)}</button></li>)}</ul>
      {selected && <section className="space-y-3">
        <div className="grid gap-5 md:grid-cols-2"><article><h2>{t("Bron", "Source", "Quelle")} · {selected.source_locale} · r{selected.source_revision}</h2><h3>{source?.title}</h3><RichTextView doc={source?.body} /><pre className="max-h-72 overflow-auto whitespace-pre-wrap">{JSON.stringify(source, null, 2)}</pre></article><article><h2>{t("Voorstel", "Proposal", "Vorschlag")} · {selected.target_locale}</h2><h3>{selected.proposed?.title}</h3><RichTextView doc={selected.proposed?.body} /><pre className="max-h-72 overflow-auto whitespace-pre-wrap">{JSON.stringify(selected.proposed, null, 2)}</pre></article></div>
        {selected.status === "proposed" && <>
          <label className="block"><input type="checkbox" checked={language} onChange={event => { setLanguage(event.target.checked); setReviewed(false); }} />{t("Taal correct", "Language correct", "Sprache korrekt")}</label>
          <label className="block"><input type="checkbox" checked={meaning} onChange={event => { setMeaning(event.target.checked); setReviewed(false); }} />{t("Betekenis behouden", "Meaning preserved", "Bedeutung erhalten")}</label>
          <label className="block">{t("Reviewnotitie", "Review note", "Prüfnotiz")}<textarea className={control} value={note} maxLength={2000} onChange={event => { setNote(event.target.value); setReviewed(false); }} /></label>
          <button className={control} disabled={!note.trim() || reviewed} onClick={() => void run(async () => {
            const response = await apiRequest<{ data: { accepted: boolean } }>({ path: root + "/suggestions/" + selected.id + "/review", method: "POST", locale, body: { locale: selected.target_locale, language_correct: language, meaning_preserved: meaning, note } });
            setReviewed(response.data.accepted); if (!response.data.accepted) setSelected({ ...selected, status: "rejected" }); await list(page); setNotice(t("Review vastgelegd.", "Review recorded.", "Prüfung gespeichert."));
          })}>{t("Onafhankelijke review vastleggen", "Record independent review", "Unabhängige Prüfung speichern")}</button>
          <label className="block">{t("Doeladres (optioneel)", "Target slug (optional)", "Zieladresse (optional)")}<input className={control} value={slug} onChange={event => setSlug(event.target.value)} /></label>
          <button className={control} onClick={() => void run(async () => { await apiRequest({ path: root + "/suggestions/" + selected.id + "/apply", method: "POST", locale, body: slug ? { slug } : {} }); setSelected({ ...selected, status: "applied" }); await list(page); setNotice(t("Toegepast op concept.", "Applied to draft.", "Auf Entwurf angewendet.")); })}>{t("Goedgekeurd voorstel toepassen", "Apply approved proposal", "Genehmigten Vorschlag anwenden")}</button>
        </>}
      </section>}
    </fieldset>
  </AdminListPage>;
}
