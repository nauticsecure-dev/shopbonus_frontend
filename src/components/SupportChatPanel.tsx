"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import {
  progressCopy,
  TERMINAL_STATUSES,
  actionFromMessage,
  answerFromMessage,
  fetchSupportMessage,
  newIdempotencyKey,
  resolveSupportActionHref,
  startSupportChat,
  type SupportMessage,
} from "@/lib/support";
import { useLocale } from "@/i18n/LocaleContext";

type Props = {
  open: boolean;
  onClose: () => void;
  voucherId?: string | null;
  merchantName?: string | null;
};

export default function SupportChatPanel({ open, onClose, voucherId, merchantName }: Props) {
  const { locale } = useLocale();
  const [message, setMessage] = useState(
    "Ik heb een probleem met mijn vouchercode. Kun je de voorwaarden en status controleren?"
  );
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [reply, setReply] = useState<SupportMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReply(null);
    setError(null);
    setStatus(null);
    setProgress(null);
    setMessage(
      merchantName
        ? `Ik heb een probleem met mijn vouchercode bij ${merchantName}. Kun je de voorwaarden en status controleren?`
        : "Ik heb een probleem met mijn vouchercode. Kun je de voorwaarden en status controleren?"
    );
  }, [open, merchantName, voucherId]);

  const send = useCallback(async () => {
    if (!message.trim() || busy) return;
    setBusy(true);
    setError(null);
    setReply(null);
    const key = newIdempotencyKey();
    try {
      const started = await startSupportChat(
        {
          message: message.trim(),
          conversation_id: conversationId ?? undefined,
          reference: voucherId ?? undefined,
          current_page: "/mijn-voordelen",
          locale: locale === "en" ? "en" : "nl",
        },
        key,
        locale
      );
      setConversationId(started.conversation_id);
      setStatus(started.status);
      setProgress(progressCopy(locale, started.status) || progressCopy(locale, "PENDING") || null);

      let attempts = 0;
      let current: SupportMessage | null = null;
      while (attempts < 40) {
        await new Promise((r) => setTimeout(r, 900));
        current = await fetchSupportMessage(started.id, locale);
        setStatus(current.status);
        if (progressCopy(locale, current.status)) setProgress(progressCopy(locale, current.status)!);
        if (TERMINAL_STATUSES.has(current.status)) break;
        attempts += 1;
      }
      setReply(current);
      setProgress(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Support is tijdelijk niet beschikbaar.");
    } finally {
      setBusy(false);
    }
  }, [message, busy, conversationId, voucherId, locale]);

  if (!open) return null;

  const answer = answerFromMessage(reply);
  const action = actionFromMessage(reply);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="support-title">
      <button className="absolute inset-0 cursor-default" aria-label="Sluiten" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="support-title" className="text-lg font-black text-navy">
              Probleem met code?
            </h2>
            <p className="text-sm text-muted">ShopBonus AI-klantenservice · geverifieerde antwoorden</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-muted hover:bg-slate-100" aria-label="Sluiten">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {voucherId && (
            <p className="rounded-2xl bg-mist px-3 py-2 text-xs font-semibold text-muted">
              Vouchercontext: <span className="font-mono text-navy">{voucherId}</span>
            </p>
          )}
          <label className="block text-sm font-bold text-navy">
            Jouw vraag
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-2xl border border-blue-100 bg-white px-3 py-2.5 text-sm font-medium text-navy outline-none focus:border-brand"
              maxLength={2000}
            />
          </label>
          {(progress || status) && (
            <p className="text-xs font-semibold text-muted" aria-live="polite">
              {progress || status}
            </p>
          )}
          {error && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>}
          {answer && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm leading-relaxed text-navy">
              {answer}
              {reply && (reply.status === "VERIFIED" || reply.status === "PARTIALLY_VERIFIED") && (
                <p className="mt-2 text-xs font-bold text-emerald-700">✓ Gecontroleerd met je accountgegevens</p>
              )}
              {action && (
                <Link
                  href={resolveSupportActionHref(action.route)}
                  className="mt-3 inline-flex rounded-full bg-brand px-3 py-1.5 text-xs font-extrabold text-white"
                >
                  {action.label} →
                </Link>
              )}
            </div>
          )}
          <Link href="/app/support" className="block text-center text-xs font-bold text-brand">
            Open volledige Support-chat →
          </Link>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-navy hover:bg-slate-50"
          >
            Sluiten
          </button>
          <button
            onClick={() => void send()}
            disabled={busy || !message.trim()}
            className="flex-1 rounded-2xl bg-brand px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {busy ? "Bezig…" : "Verstuur"}
          </button>
        </div>
      </div>
    </div>
  );
}
