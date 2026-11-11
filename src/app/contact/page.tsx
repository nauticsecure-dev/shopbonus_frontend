"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { contactCopy } from "@/i18n/contactCopy";
import { apiRequest, ApiError } from "@/lib/api";
import { fetchPublicPage, type PublicCmsPage } from "@/lib/cms";
import RichTextView from "@/components/cms/RichTextView";

type Field = "name" | "email" | "subject" | "message" | "privacy" | "website";

export default function ContactPage() {
  const { locale } = useLocale();
  const copy = contactCopy[locale];
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);
  const [content, setContent] = useState<PublicCmsPage | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string[]>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void fetchPublicPage(locale, "contact").then((page) => { if (!cancelled) setContent(page); }).catch(() => { if (!cancelled) setContent(null); });
    return () => { cancelled = true; };
  }, [locale]);
  useEffect(() => { if (sent) successRef.current?.focus(); }, [sent]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setErrors({}); setFailure(null); setSent(false);
    try {
      await apiRequest({ path: "/api/v1/public/contact", method: "POST", locale, body: {
        name: data.get("name"), email: data.get("email"), subject: data.get("subject"), message: data.get("message"), privacy: data.get("privacy") === "on", website: data.get("website"),
      } });
      form.reset(); setSent(true);
    } catch (error) {
      const fields = error instanceof ApiError && error.status === 422 ? (error.body as { error?: { fields?: Partial<Record<Field, string[]>> } })?.error?.fields : undefined;
      if (fields && Object.keys(fields).length) {
        setErrors(fields);
        requestAnimationFrame(() => {
          const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
          invalid?.focus();
        });
      } else setFailure(error instanceof ApiError ? error.message : copy.error);
    } finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <h1 className="text-3xl font-black text-navy">{content?.locale === locale ? content.content.title : copy.title}</h1>
    {content?.locale === locale ? <RichTextView doc={content.content.body} /> : <p className="mt-3 text-muted">{copy.intro}</p>}
    {sent && <p ref={successRef} tabIndex={-1} role="status" className="mt-6 rounded-xl bg-green-50 p-4 text-green-800">{copy.success}</p>}
    <form ref={formRef} onSubmit={submit} noValidate className="mt-8 space-y-5">
      {(["name", "email", "subject", "message"] as const).map((field) => <div key={field}>
        <label htmlFor={`contact-${field}`} className="block font-bold text-navy">{copy[field]} *</label>
        {field === "message" ? <textarea id={`contact-${field}`} name={field} required minLength={10} maxLength={5000} rows={7} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `contact-${field}-error` : undefined} className="mt-2 w-full rounded-xl border border-blue-200 p-3 focus:outline-brand" /> : <input id={`contact-${field}`} name={field} type={field === "email" ? "email" : "text"} autoComplete={field === "email" ? "email" : field === "name" ? "name" : "off"} required maxLength={field === "email" ? 254 : field === "name" ? 120 : 180} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `contact-${field}-error` : undefined} className="mt-2 w-full rounded-xl border border-blue-200 p-3 focus:outline-brand" />}
        {errors[field] && <p id={`contact-${field}-error`} className="mt-1 text-sm text-red-700">{[...new Set(errors[field])].join(" ")}</p>}
      </div>)}
      <div className="absolute -left-[10000px]" aria-hidden="true"><label>{copy.website}<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div>
        <label className="flex items-start gap-3"><input name="privacy" type="checkbox" required aria-invalid={!!errors.privacy} aria-describedby={errors.privacy ? "contact-privacy-error" : undefined} className="mt-1" /><span>{copy.privacy} *</span></label>
        <Link href="/pagina/privacy" className="mt-2 inline-block font-bold text-brand underline">{copy.privacyLink}</Link>
        {errors.privacy && <p id="contact-privacy-error" className="mt-1 text-sm text-red-700">{[...new Set(errors.privacy)].join(" ")}</p>}
      </div>
      {failure && <p role="alert" className="text-red-700">{failure}</p>}
      <button disabled={busy} className="rounded-full bg-brand px-6 py-3 font-bold text-white disabled:opacity-60">{busy ? copy.sending : copy.send}</button>
    </form>
  </main>;
}
