"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import AdminStepUpModal from "@/components/AdminStepUpModal";
import { ApiError } from "@/lib/api";
import { updatePlatformTemplate, type PlatformTemplate } from "@/lib/notifications";

export default function NotificationTemplateEditor({ template, allowedVariables, onSaved }: {
  template: PlatformTemplate;
  allowedVariables: string[];
  onSaved: () => Promise<void>;
}) {
  const { locale } = useLocale();
  const text = (nl: string, en: string) => locale === "nl" ? nl : en;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState({ title: "", body: "", action_label: "" });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [stepUp, setStepUp] = useState(false);
  const inputClass = "mt-1 w-full rounded-xl border border-blue-100 px-3 py-2 font-normal";
  const save = async () => {
    await updatePlatformTemplate(template.id, { value, expected_checksum: template.checksum, reason: reason.trim() });
    await onSaved();
    setEditing(false); setSaved(true);
  };

  if (!editing) return <div className="mt-3">
    <button type="button" disabled={busy} className="rounded-lg border border-blue-100 px-3 py-2 text-xs font-extrabold text-brand"
      onClick={() => {
        setValue({ title: template.value.title ?? "", body: template.value.body ?? "", action_label: template.value.action_label ?? "" });
        setReason(""); setError(null); setSaved(false); setEditing(true);
      }}>{text("Bewerken als nieuw concept", "Edit as new draft")}</button>
    {saved && <p role="status" className="mt-2 text-sm text-green-700">{text("Nieuw concept opgeslagen. Test deze versie voor publicatie.", "New draft saved. Test this version before publishing.")}</p>}
  </div>;

  return <><form className="mt-4 space-y-3 border-t border-blue-100 pt-4" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      await save();
    } catch (err) {
      if (err instanceof ApiError && ["password_confirmation_required", "step_up_code_required"].includes(err.code ?? "")) setStepUp(true);
      else setError(err instanceof Error ? err.message : text("Opslaan mislukt.", "Could not save."));
    } finally { setBusy(false); }
  }}>
    <p className="text-sm text-muted">{text("Opslaan maakt een nieuwe versie. Gepubliceerde inhoud blijft actief tot goedkeuring.", "Saving creates a new version. Published content stays active until approval.")}</p>
    <p className="text-xs text-muted">{text("Toegestane variabelen", "Allowed variables")}: {allowedVariables.length ? allowedVariables.map(v => `{{${v}}}`).join(", ") : text("geen", "none")}</p>
    <fieldset disabled={busy} className="space-y-3">
      <label className="block text-sm font-bold text-navy">{text("Titel", "Title")} ({value.title.length}/70)
        <input required maxLength={70} value={value.title} onChange={e => setValue(v => ({ ...v, title: e.target.value }))} className={inputClass} />
      </label>
      <label className="block text-sm font-bold text-navy">{text("Bericht", "Body")} ({value.body.length}/180)
        <textarea required maxLength={180} rows={3} value={value.body} onChange={e => setValue(v => ({ ...v, body: e.target.value }))} className={inputClass} />
      </label>
      <label className="block text-sm font-bold text-navy">{text("Knoptekst", "Action label")} ({value.action_label.length}/40)
        <input required maxLength={40} value={value.action_label} onChange={e => setValue(v => ({ ...v, action_label: e.target.value }))} className={inputClass} />
      </label>
      <label className="block text-sm font-bold text-navy">{text("Reden voor wijziging", "Reason for change")}
        <input required minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className={inputClass} />
      </label>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex gap-2">
      <button type="submit" disabled={busy || reason.trim().length < 5} className="rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{text("Concept opslaan", "Save draft")}</button>
      <button type="button" disabled={busy} onClick={() => setEditing(false)} className="rounded-lg border border-blue-100 px-3 py-2 text-sm">{text("Annuleren", "Cancel")}</button>
    </div>
  </form>
    <AdminStepUpModal open={stepUp} title={text("Concept opslaan", "Save draft")} onClose={() => setStepUp(false)} onReady={save} />
  </>;
}

export function NotificationTemplatePreview({ report }: { report: Record<string, unknown> }) {
  const { locale } = useLocale();
  const preview = report.preview as { title?: string; body?: string; action_label?: string } | undefined;
  if (!preview) return null;
  return <section aria-label={locale === "nl" ? "Testvoorbeeld" : "Test preview"} className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
    <p className="text-xs font-bold text-muted">{locale === "nl" ? "Testvoorbeeld · geen e-mail verstuurd" : "Synthetic preview · no email sent"}</p>
    <h3 className="mt-3 text-lg font-bold text-navy">{preview.title}</h3>
    <p className="mt-2 text-sm text-navy">{preview.body}</p>
    <span className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">{preview.action_label}</span>
  </section>;
}
