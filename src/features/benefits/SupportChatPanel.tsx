"use client";

import { useEffect, useState } from "react";
import { api, mutate, ApiError } from "@/lib/api";
import Icon from "@/features/dashboard/components/DashboardIcon";

type Props = {
  voucherId: string;
  onClose: () => void;
};

type ChatMessage = {
  id: string;
  status?: string;
  question?: string;
  answer?: { body?: string; status?: string } | string | null;
};

/**
 * Reuses POST /api/v1/ai/chat with voucher ownership context.
 * No duplicate chatbot implementation.
 */
export default function SupportChatPanel({ voucherId, onClose }: Props) {
  const [message, setMessage] = useState("Ik heb een probleem met mijn vouchercode.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingId) return;
    let active = true;
    const tick = window.setInterval(async () => {
      try {
        const res = await api<{ data: ChatMessage }>("ai/messages/" + pendingId);
        if (!active) return;
        const status = res.data.status || "";
        if (!["QUEUED", "RESEARCHING", "ANSWERING"].includes(status)) {
          setPendingId(null);
          if (conversationId) {
            const hist = await api<{ data: { messages: ChatMessage[] } }>("ai/conversations/" + conversationId);
            if (active) setMessages(hist.data.messages || []);
          }
        }
      } catch {
        /* keep polling until terminal or unmount */
      }
    }, 1500);
    return () => {
      active = false;
      window.clearInterval(tick);
    };
  }, [pendingId, conversationId]);

  async function send() {
    if (busy || !message.trim()) return;
    setBusy(true);
    setError("");
    try {
      const key = crypto.randomUUID();
      const res = await mutate<{ data: { id: string; conversation_id: string; status: string } }>(
        "ai/chat",
        {
          message: message.trim(),
          locale: "nl",
          reference: voucherId,
          current_page: "/mijn-voordelen",
          conversation_id: conversationId || undefined,
        },
        "POST",
        { "Idempotency-Key": key },
      );
      setConversationId(res.data.conversation_id);
      setPendingId(res.data.id);
      setMessages((prev) => [...prev, { id: res.data.id, status: res.data.status, question: message.trim() }]);
      setMessage("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kon de assistent niet starten.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Hulp bij vouchercode" className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-blue-50 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand">ShopBonus hulp</p>
            <h2 className="text-lg font-extrabold text-navy">Probleem met code?</h2>
          </div>
          <button type="button" aria-label="Sluiten" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand">
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted">
              Onze assistent controleert jouw voucherstatus en voorwaarden. Er wordt geen code gedeeld met derden.
            </p>
          )}
          {messages.map((m) => {
            const answer = typeof m.answer === "string" ? m.answer : m.answer?.body;
            return (
              <div key={m.id} className="space-y-2">
                {m.question && <div className="ml-8 rounded-2xl bg-brand px-4 py-3 text-sm text-white">{m.question}</div>}
                <div className="mr-8 rounded-2xl bg-mist px-4 py-3 text-sm text-navy">
                  {answer || (pendingId === m.id ? "Bezig met controleren…" : m.status || "Antwoord volgt")}
                </div>
              </div>
            );
          })}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </div>
        <form
          className="border-t border-blue-50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label className="sr-only" htmlFor="support-message">Bericht</label>
          <textarea
            id="support-message"
            className="form-input min-h-[88px] w-full"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            disabled={busy || !!pendingId}
          />
          <button type="submit" disabled={busy || !!pendingId || !message.trim()} className="primary-button mt-3 w-full disabled:opacity-50">
            Verstuur naar assistent
          </button>
        </form>
      </div>
    </div>
  );
}
