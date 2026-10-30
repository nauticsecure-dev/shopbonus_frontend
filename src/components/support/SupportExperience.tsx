"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { fetchMeWallet, type WalletSummary } from "@/lib/benefits";
import { subscribeSupportConversation } from "@/lib/echo";
import { formatMinor } from "@/lib/money";
import {
  TERMINAL_STATUSES,
  actionFromMessage,
  answerFromMessage,
  escalateSupportMessage,
  fetchSupportConversation,
  fetchSupportMessage,
  isVerifiedStatus,
  listSupportConversations,
  newIdempotencyKey,
  progressCopy,
  resolveSupportActionHref,
  searchSupportKnowledge,
  startSupportChat,
  submitSupportFeedback,
  type KnowledgeHit,
  type SupportMessage,
  type SupportReply,
} from "@/lib/support";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
type Mode = "consumer" | "workspace";

type FeedbackPayloadReason =
  | "incorrect_information"
  | "did_not_answer"
  | "outdated_information"
  | "unclear"
  | "other";

type ChatBubble =
  | { kind: "user"; id: string; text: string; at: string }
  | {
      kind: "assistant";
      id: string;
      text: string;
      status: string;
      progress?: string | null;
      verified: boolean;
      action: { label: string; href: string } | null;
      at: string;
      pending?: boolean;
      feedback?: "up" | "down" | null;
    }
  | { kind: "human"; id: string; text: string; at: string };

type Props = {
  mode: Mode;
  workspaceId?: string | null;
  workspaceSummary?: { title: string; lines: string[] } | null;
  initialConversationId?: string | null;
};

const CONSUMER_SUGGESTIONS = [
  { label: "✦ Mijn beloningen", text: "Waar blijft mijn beloning?" },
  { label: "🎫 Voucher gebruiken", text: "Hoe gebruik ik een voucher?" },
  { label: "📦 Bestelstatus", text: "Wat is de status van mijn beloning?" },
];

const WORKSPACE_SUGGESTIONS = [
  { label: "✦ Financiering", text: "Wat is ons webshopfinancieringssaldo?" },
  { label: "📊 Campagne", text: "Toon campagneprestaties" },
  { label: "🔌 Integratie", text: "Werkt mijn Shopify-koppeling?" },
];

const FAQ_FALLBACK_CONSUMER = [
  "Hoe werken beloningen?",
  "Wanneer wordt mijn beloning beschikbaar?",
  "Hoe gebruik ik een voucher?",
];

const FAQ_FALLBACK_WORKSPACE = [
  "Hoe werkt webshopfinanciering?",
  "Wat betekenen campagneklikken?",
  "Wat als mijn integratie faalt?",
];

function clock(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function reservedFromWallet(w: WalletSummary | null): number {
  if (!w) return 0;
  if (typeof (w as WalletSummary & { reserved_minor?: number }).reserved_minor === "number") {
    return (w as WalletSummary & { reserved_minor: number }).reserved_minor;
  }
  const eur = w.balances?.eur_credit as { reserved?: number } | undefined;
  return typeof eur?.reserved === "number" ? eur.reserved : 0;
}

export default function SupportExperience({
  mode,
  workspaceId = null,
  workspaceSummary = null,
  initialConversationId = null,
}: Props) {
  const { locale } = useLocale();
  const { session, ready } = useSession();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [faq, setFaq] = useState<KnowledgeHit[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [downvoteFor, setDownvoteFor] = useState<string | null>(null);
  const [downvoteReason, setDownvoteReason] = useState<FeedbackPayloadReason>("incorrect_information");
  const [downvoteComment, setDownvoteComment] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pendingIdRef = useRef<string | null>(null);
  const idempotencyRef = useRef<string | null>(null);
  const liveRef = useRef(true);

  const suggestions = mode === "workspace" ? WORKSPACE_SUGGESTIONS : CONSUMER_SUGGESTIONS;
  const faqFallback = mode === "workspace" ? FAQ_FALLBACK_WORKSPACE : FAQ_FALLBACK_CONSUMER;

  const scrollToBottom = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    liveRef.current = true;
    return () => {
      liveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !session?.user) return;
    const ac = new AbortController();
    if (mode === "consumer") {
      void fetchMeWallet(locale)
        .then((w) => {
          if (!ac.signal.aborted) setWallet(w);
        })
        .catch(() => {
          if (!ac.signal.aborted) setWallet(null);
        });
    }
    void searchSupportKnowledge(
      mode === "workspace" ? "financiering campagne integratie" : "beloning voucher tegoed",
      { workspace_id: workspaceId ?? undefined, locale: locale === "en" ? "en" : "nl" },
      locale
    )
      .then((hits) => {
        if (!ac.signal.aborted) setFaq(hits.slice(0, 5));
      })
      .catch(() => {
        if (!ac.signal.aborted) setFaq([]);
      });
    return () => ac.abort();
  }, [ready, session?.user, mode, workspaceId, locale]);

  const hydrateConversation = useCallback(
    async (id: string) => {
      const detail = await fetchSupportConversation(id, locale);
      const next: ChatBubble[] = [];
      for (const m of detail.messages) {
        next.push({ kind: "user", id: `u-${m.id}`, text: m.question, at: m.created_at });
        const answer = answerFromMessage(m);
        const action = actionFromMessage(m);
        if (answer || TERMINAL_STATUSES.has(m.status)) {
          next.push({
            kind: "assistant",
            id: m.id,
            text:
              answer ||
              (m.status === "ESCALATED"
                ? "Een medewerker is gevraagd om mee te kijken."
                : m.status === "NEEDS_CLARIFICATION"
                  ? "Ik heb nog één aanvullende vraag nodig."
                  : "We konden dit nu niet veilig beantwoorden."),
            status: m.status,
            verified: isVerifiedStatus(m.status),
            action: action
              ? { label: action.label, href: resolveSupportActionHref(action.route) }
              : null,
            at: m.completed_at || m.created_at,
          });
        }
      }
      for (const r of detail.replies as SupportReply[]) {
        next.push({ kind: "human", id: r.id, text: r.body, at: r.created_at });
      }
      if (!liveRef.current) return;
      setConversationId(detail.id);
      setBubbles(next);
      setOnline(true);
    },
    [locale]
  );

  useEffect(() => {
    if (!initialConversationId || !session?.user) return;
    void hydrateConversation(initialConversationId).catch(() => {
      setError("Dit gesprek is niet beschikbaar of verlopen.");
    });
  }, [initialConversationId, session?.user, hydrateConversation]);

  useEffect(() => {
    if (!ready || !session?.user || initialConversationId) return;
    let cancelled = false;
    void (async () => {
      let id: string | null = null;
      try {
        id = sessionStorage.getItem(`shopbonus.support.conversation.${mode}`);
      } catch {
        id = null;
      }
      if (!id) {
        try {
          const list = await listSupportConversations(locale);
          const matching = list.filter((c) =>
            mode === "consumer" ? c.workspace_id == null : c.workspace_id === workspaceId
          );
          if (matching.length > 0) {
            matching.sort((a, b) => b.expires_at.localeCompare(a.expires_at));
            id = matching[0].id;
          }
        } catch {
          /* ignore list failures */
        }
      }
      if (!id || cancelled) return;
      try {
        await hydrateConversation(id);
      } catch {
        if (!cancelled) setError("Dit gesprek is niet beschikbaar of verlopen.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session?.user, initialConversationId, mode, workspaceId, locale, hydrateConversation]);

  useEffect(() => {
    if (!conversationId) return;
    try {
      sessionStorage.setItem(`shopbonus.support.conversation.${mode}`, conversationId);
    } catch {
      /* ignore */
    }
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path !== "/app/support" && path !== "/dashboard/support") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("conversation") === conversationId) return;
    url.searchParams.set("conversation", conversationId);
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
  }, [conversationId, mode]);

  useEffect(() => {
    scrollToBottom();
  }, [bubbles, progress, scrollToBottom]);

  useEffect(() => {
    if (!conversationId) return;
    let disposed = false;
    let unsub: (() => void) | undefined;
    void subscribeSupportConversation(conversationId, (event, payload) => {
      if (disposed) return;
      const progressText = progressCopy(locale, event);
      if (progressText) {
        setProgress(progressText);
        setBubbles((prev) =>
          prev.map((b) =>
            b.kind === "assistant" && b.pending
              ? { ...b, progress: progressText, status: payload.status || b.status }
              : b
          )
        );
      }
      const messageId = payload.message_id || pendingIdRef.current;
      if (
        (event === "ChatAnswerVerified" ||
          event === "ChatAnswerUnavailable" ||
          event === "ChatSupportReplyAvailable") &&
        messageId
      ) {
        void fetchSupportMessage(messageId, locale)
          .then((msg) => applyAssistantMessage(msg))
          .catch(() => undefined);
        if (event === "ChatSupportReplyAvailable" && conversationId) {
          void hydrateConversation(conversationId).catch(() => undefined);
        }
      }
    }).then((fn) => {
      if (disposed) fn();
      else unsub = fn;
    });
    return () => {
      disposed = true;
      unsub?.();
    };
    // applyAssistantMessage is stable enough via refs; avoid resubscribing each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, locale, hydrateConversation]);

  const applyAssistantMessage = useCallback((msg: SupportMessage) => {
    const answer = answerFromMessage(msg);
    const action = actionFromMessage(msg);
    const terminal = TERMINAL_STATUSES.has(msg.status);
    if (!terminal && !answer) return;
    setProgress(null);
    setBusy(false);
    pendingIdRef.current = null;
    idempotencyRef.current = null;
    setBubbles((prev) => {
      const withoutPending = prev.filter((b) => !(b.kind === "assistant" && b.pending && b.id === msg.id));
      const existingIdx = withoutPending.findIndex((b) => b.kind === "assistant" && b.id === msg.id);
      const bubble: ChatBubble = {
        kind: "assistant",
        id: msg.id,
        text:
          answer ||
          (msg.status === "ESCALATED"
            ? "Een medewerker is gevraagd om mee te kijken."
            : msg.status === "NEEDS_CLARIFICATION"
              ? "Ik heb nog één gerichte vraag nodig om verder te helpen."
              : "We konden dit nu niet veilig beantwoorden. Je kunt contact opnemen met support."),
        status: msg.status,
        verified: isVerifiedStatus(msg.status),
        action: action ? { label: action.label, href: resolveSupportActionHref(action.route) } : null,
        at: msg.completed_at || msg.created_at,
        pending: false,
        feedback: null,
      };
      if (existingIdx >= 0) {
        const copy = [...withoutPending];
        copy[existingIdx] = bubble;
        return copy;
      }
      return [...withoutPending, bubble];
    });
  }, []);

  const pollUntilDone = useCallback(
    async (messageId: string) => {
      let attempts = 0;
      while (attempts < 48 && liveRef.current) {
        await new Promise((r) => setTimeout(r, 900));
        try {
          const msg = await fetchSupportMessage(messageId, locale);
          const statusProgress = progressCopy(locale, msg.status);
          if (statusProgress) setProgress(statusProgress);
          if (TERMINAL_STATUSES.has(msg.status)) {
            applyAssistantMessage(msg);
            return;
          }
        } catch {
          /* keep polling briefly */
        }
        attempts += 1;
      }
      if (liveRef.current) {
        setBusy(false);
        setProgress(null);
        setBubbles((prev) =>
          prev.map((b) =>
            b.kind === "assistant" && b.pending
              ? {
                  ...b,
                  pending: false,
                  text: "Het duurt langer dan verwacht. Vernieuw het gesprek of probeer het zo opnieuw.",
                  status: "UNAVAILABLE",
                }
              : b
          )
        );
      }
    },
    [locale, applyAssistantMessage]
  );

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy || !session?.user) return;
      setBusy(true);
      setError(null);
      setProgress(progressCopy(locale, "PENDING") ?? null);
      const now = new Date().toISOString();
      setBubbles((prev) => [...prev, { kind: "user", id: `local-${Date.now()}`, text: message, at: now }]);
      setDraft("");
      const key = idempotencyRef.current ?? newIdempotencyKey();
      idempotencyRef.current = key;
      try {
        const started = await startSupportChat(
          {
            message,
            conversation_id: conversationId ?? undefined,
            workspace_id: mode === "workspace" ? workspaceId ?? undefined : undefined,
            current_page: mode === "workspace" ? "/dashboard/support" : "/app/support",
            locale: locale === "en" ? "en" : "nl",
          },
          key,
          locale
        );
        setConversationId(started.conversation_id);
        pendingIdRef.current = started.id;
        setBubbles((prev) => [
          ...prev,
          {
            kind: "assistant",
            id: started.id,
            text: "",
            status: started.status,
            progress: progressCopy(locale, started.status) || progressCopy(locale, "PENDING"),
            verified: false,
            action: null,
            at: now,
            pending: true,
          },
        ]);
        void pollUntilDone(started.id);
      } catch (err) {
        setBusy(false);
        setProgress(null);
        idempotencyRef.current = null;
        setError(err instanceof ApiError ? err.message : "Support is tijdelijk niet beschikbaar.");
        setOnline(false);
      }
    },
    [busy, session?.user, conversationId, mode, workspaceId, locale, pollUntilDone]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  };

  const submitFeedback = async (messageId: string, rating: "up" | "down") => {
    if (rating === "down") {
      setDownvoteFor(messageId);
      return;
    }
    try {
      await submitSupportFeedback(messageId, { rating: "up" }, locale);
      setBubbles((prev) =>
        prev.map((b) => (b.kind === "assistant" && b.id === messageId ? { ...b, feedback: "up" } : b))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Feedback kon niet worden opgeslagen.");
    }
  };

  const confirmDownvote = async () => {
    if (!downvoteFor) return;
    try {
      await submitSupportFeedback(
        downvoteFor,
        { rating: "down", reason: downvoteReason, comment: downvoteComment || undefined },
        locale
      );
      setBubbles((prev) =>
        prev.map((b) =>
          b.kind === "assistant" && b.id === downvoteFor ? { ...b, feedback: "down" } : b
        )
      );
      setDownvoteFor(null);
      setDownvoteComment("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Feedback kon niet worden opgeslagen.");
    }
  };

  const reservedMinor = reservedFromWallet(wallet);
  const availableMinor = wallet?.available_minor ?? 0;

  const pageHeading =
    mode === "consumer"
      ? locale === "en"
        ? "Ask ShopBonus"
        : "Vraag ShopBonus"
      : "Support";

  const faqItems = useMemo(() => {
    if (faq.length === 0) return faqFallback.map((q) => ({ title: q, id: q }));
    return faq.map((h) => ({
      title: (h.question || h.content || "FAQ").slice(0, 80),
      id: h.document_id,
    }));
  }, [faq, faqFallback]);

  if (!ready) {
    return <p className="p-8 text-sm text-muted">Laden…</p>;
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-navy">Log in voor Support</h1>
        <p className="mt-2 text-muted">ShopBonus-klantenservice is beschikbaar na inloggen.</p>
        <Link href="/account?mode=login" className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-extrabold text-white">
          Inloggen
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-72px)] bg-[#eef4ff]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="page-blob -left-24 top-10 h-72 w-72 bg-blue-200/40" />
        <div className="page-blob -right-16 top-40 h-80 w-80 bg-sky-100/70" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-navy/70">
            ShopBonus klantenservice
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-navy sm:text-4xl">
            {pageHeading}
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            {mode === "workspace"
              ? "Stel je vraag over financiering, campagnes of integraties in deze webshop."
              : "Stel je vraag over je ShopBonus-tegoed, vouchers of je account."}
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <section
            className="flex min-h-[560px] flex-col overflow-hidden rounded-[22px] border border-blue-100/80 bg-white shadow-[0_18px_40px_-28px_rgba(11,116,255,0.45)]"
            aria-label="Supportchat"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white" aria-hidden>
                  <svg width="18" height="20" viewBox="0 0 35 42" fill="none">
                    <path d="M10 14V10a7.5 7.5 0 0 1 15 0v4" stroke="currentColor" strokeWidth="3.3" />
                    <path d="M6 13h23l3 25H3l3-25Z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-navy">ShopBonus klantenservice</p>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-400"}`} />
                    {online ? "Online" : "Verbinding herstellen…"}
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={scrollerRef}
              className="flex-1 space-y-4 overflow-y-auto bg-[#f7faff] px-4 py-5 sm:px-5"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >
              {bubbles.length === 0 && (
                <p className="rounded-2xl bg-white px-4 py-3 text-sm text-muted shadow-sm">
                  Stel je vraag hieronder. Antwoorden zijn gebaseerd op geverifieerde accountgegevens.
                </p>
              )}
              {bubbles.map((b) => {
                if (b.kind === "user") {
                  return (
                    <div key={b.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#dcebff] px-4 py-3 text-sm font-medium text-navy shadow-sm">
                        <p className="whitespace-pre-wrap">{b.text}</p>
                        <p className="mt-1 text-right text-[11px] font-semibold text-brand/80">{clock(b.at)} ✓✓</p>
                      </div>
                    </div>
                  );
                }
                if (b.kind === "human") {
                  return (
                    <div key={b.id} className="flex justify-start">
                      <div className="max-w-[90%] rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-navy">
                        <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-amber-700">
                          Medewerker
                        </p>
                        <p className="whitespace-pre-wrap">{b.text}</p>
                        <p className="mt-2 text-[11px] text-muted">{clock(b.at)}</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={b.id} className="flex justify-start">
                    <div className="max-w-[92%] rounded-2xl border border-blue-50 bg-white px-4 py-3 text-sm text-navy shadow-sm">
                      {b.pending ? (
                        <p className="font-semibold text-muted">{b.progress || progress || "Bezig…"}</p>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap leading-relaxed">{b.text}</p>
                          {b.verified && (
                            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              <span aria-hidden>✓</span> Gecontroleerd met je accountgegevens
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              aria-label="Nuttig"
                              disabled={b.feedback !== null && b.feedback !== undefined}
                              onClick={() => void submitFeedback(b.id, "up")}
                              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-muted hover:bg-slate-50 disabled:opacity-50"
                            >
                              👍
                            </button>
                            <button
                              type="button"
                              aria-label="Niet nuttig"
                              disabled={b.feedback !== null && b.feedback !== undefined}
                              onClick={() => void submitFeedback(b.id, "down")}
                              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-muted hover:bg-slate-50 disabled:opacity-50"
                            >
                              👎
                            </button>
                            {b.action && (
                              <Link
                                href={b.action.href}
                                className="inline-flex items-center rounded-full bg-brand px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-dark"
                              >
                                {b.action.label} →
                              </Link>
                            )}
                            {(b.status === "UNAVAILABLE" ||
                              b.status === "NEEDS_CLARIFICATION" ||
                              b.status === "PARTIALLY_VERIFIED" ||
                              b.status === "ESCALATED") && (
                              <button
                                type="button"
                                disabled={b.status === "ESCALATED"}
                                onClick={() => void escalateSupportMessage(b.id, locale)}
                                className="text-xs font-bold text-brand underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                              >
                                {b.status === "ESCALATED"
                                  ? "Doorgestuurd naar support"
                                  : "Neem contact op met support"}
                              </button>
                            )}
                          </div>
                          <p className="mt-2 text-[11px] text-muted">{clock(b.at)}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-100 bg-white px-4 py-4 sm:px-5">
              {error && (
                <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600" role="alert">
                  {error}
                </p>
              )}
              <div className="flex items-end gap-2 rounded-full border border-blue-100 bg-[#f7faff] px-3 py-2 focus-within:border-brand">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  maxLength={2000}
                  placeholder="Stel je vraag over ShopBonus..."
                  className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium text-navy outline-none"
                  aria-label="Bericht"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => void send(draft)}
                  disabled={busy || !draft.trim()}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-50"
                  aria-label="Verstuur"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 12h12M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => void send(s.text)}
                    disabled={busy}
                    className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold text-navy shadow-sm hover:border-brand/40 disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {mode === "consumer" ? (
              <div className="rounded-[20px] border border-blue-100/80 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-extrabold text-navy">Mijn ShopBonus-tegoed</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-2xl font-black text-navy">{formatMinor(availableMinor)}</p>
                    <p className="text-xs font-semibold text-muted">Beschikbaar</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-navy">{formatMinor(reservedMinor)}</p>
                    <p className="text-xs font-semibold text-muted">Gereserveerd</p>
                  </div>
                </div>
                {reservedMinor > 0 && (
                  <p className="mt-4 flex gap-2 rounded-xl bg-mist px-3 py-2 text-xs font-medium text-muted">
                    <span aria-hidden>⏱</span>
                    Je {formatMinor(reservedMinor)} beloning is gereserveerd en verschijnt in je tegoed zodra deze beschikbaar is.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-[20px] border border-blue-100/80 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-extrabold text-navy">
                  {workspaceSummary?.title || "Webshopoverzicht"}
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {(workspaceSummary?.lines || ["Alleen geautoriseerde webshopgegevens worden getoond."]).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-[20px] border border-blue-100/80 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-extrabold text-navy">Veelgestelde vragen</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {faqItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-navy hover:text-brand"
                      onClick={() => void send(item.title)}
                    >
                      <span>{item.title}</span>
                      <span aria-hidden className="text-muted">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[20px] border border-blue-100/80 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand" aria-hidden>
                  ⌢
                </span>
                <div>
                  <p className="text-sm font-bold text-navy">Kom je er niet uit? Ons team staat voor je klaar.</p>
                  <a
                    href="mailto:support@shopbonus.nl"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold text-brand"
                  >
                    Neem contact op met support →
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {downvoteFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-extrabold text-navy">Wat klopte er niet?</h3>
            <label className="mt-3 block text-sm font-bold text-navy">
              Reden
              <select
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
                value={downvoteReason}
                onChange={(e) => setDownvoteReason(e.target.value as FeedbackPayloadReason)}
              >
                <option value="incorrect_information">Onjuiste informatie</option>
                <option value="did_not_answer">Vraag niet beantwoord</option>
                <option value="outdated_information">Verouderd</option>
                <option value="unclear">Onduidelijk</option>
                <option value="other">Anders</option>
              </select>
            </label>
            <label className="mt-3 block text-sm font-bold text-navy">
              Toelichting
              <textarea
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2 text-sm"
                rows={3}
                value={downvoteComment}
                onChange={(e) => setDownvoteComment(e.target.value)}
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold" onClick={() => setDownvoteFor(null)}>
                Annuleren
              </button>
              <button type="button" className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white" onClick={() => void confirmDownvote()}>
                Verstuur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
