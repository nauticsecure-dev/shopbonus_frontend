"use client";

import Link from "next/link";
import { SUPPORT_COPY_EN } from "@/lib/supportCopy";
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

function reservedFromWallet(w: WalletSummary | null): number | null {
  if (!w) return null;
  if (typeof (w as WalletSummary & { reserved_minor?: number }).reserved_minor === "number") {
    return (w as WalletSummary & { reserved_minor: number }).reserved_minor;
  }
  const eur = w.balances?.eur_credit as { reserved?: number } | undefined;
  return typeof eur?.reserved === "number" ? eur.reserved : null;
}

export default function SupportExperience({
  mode,
  workspaceId = null,
  workspaceSummary = null,
  initialConversationId = null,
}: Props) {
  const { locale } = useLocale();
  const copy = useCallback((text: string) => locale === "en" ? (SUPPORT_COPY_EN[text] ?? text) : text, [locale]);
  const { session, ready } = useSession();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [faq, setFaq] = useState<KnowledgeHit[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveUpdates, setLiveUpdates] = useState(false);
  const [walletState, setWalletState] = useState<"loading" | "error" | "ready">("loading");
  const [walletRetry, setWalletRetry] = useState(0);
  const submittingRef = useRef(false);
  const sendGenerationRef = useRef(0);
  const displayRef = useRef({ show_progress_updates: true, show_verified_badge: true });
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
      queueMicrotask(() => { if (!ac.signal.aborted) setWalletState("loading"); });
      void fetchMeWallet(locale)
        .then((w) => {
          if (!ac.signal.aborted) {
            if (!Number.isSafeInteger(w.available_minor) || w.unit !== "EUR_REDEMPTION_CREDIT" || w.currency !== "EUR") { setWalletState("error"); return; }
            setWallet(w); setWalletState("ready");
          }
        })
        .catch(() => {
          if (!ac.signal.aborted) { setWallet(null); setWalletState("error"); }
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
  }, [ready, session?.user, mode, workspaceId, locale, walletRetry]);

  const hydrateConversation = useCallback(
    async (id: string) => {
      const generation = sendGenerationRef.current;
      const detail = await fetchSupportConversation(id, locale);
      if (!liveRef.current || submittingRef.current || generation !== sendGenerationRef.current) return;
      const next: ChatBubble[] = [];
      for (const m of detail.messages) {
        next.push({ kind: "user", id: `u-${m.id}`, text: m.question, at: m.created_at });
        const answer = answerFromMessage(m);
        const action = actionFromMessage(m);
        {
          const pending = !TERMINAL_STATUSES.has(m.status);
          if (m.display) displayRef.current = m.display;
          next.push({
            kind: "assistant",
            id: m.id,
            text:
              answer ||
              (m.status === "ESCALATED"
                ? copy("Een medewerker is gevraagd om mee te kijken.")
                : m.status === "NEEDS_CLARIFICATION"
                  ? copy("Ik heb nog één aanvullende vraag nodig.")
                  : copy("We konden dit nu niet veilig beantwoorden.")),
            status: m.status,
            pending,
            progress: displayRef.current.show_progress_updates ? progressCopy(locale, m.status) : null,
            verified: displayRef.current.show_verified_badge && isVerifiedStatus(m.status),
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
      if (!liveRef.current || submittingRef.current) return;
      setConversationId(detail.id);
      setBubbles((previous) => {
        const recovered = next.map((bubble) => {
          const old = previous.find((b) => b.id === bubble.id);
          return bubble.kind === "assistant" && old?.kind === "assistant" ? { ...bubble, feedback: old.feedback } : bubble;
        });
        return JSON.stringify(previous) === JSON.stringify(recovered) ? previous : recovered;
      });
      const active = detail.messages.find((m) => !TERMINAL_STATUSES.has(m.status));
      pendingIdRef.current = active?.id ?? null;
      setBusy(Boolean(active));
      if (!active) setProgress(null);
    },
    [locale, copy]
  );

  useEffect(() => {
    if (!initialConversationId || !session?.user) return;
    const timer = window.setTimeout(() => { void hydrateConversation(initialConversationId).catch(() => setError(copy("Dit gesprek is niet beschikbaar of verlopen."))); }, 0);
    return () => window.clearTimeout(timer);
  }, [initialConversationId, session?.user, hydrateConversation, copy]);

  useEffect(() => {
    if (!ready || !session?.user || initialConversationId) return;
    let cancelled = false;
    void (async () => {
      let id: string | null = null;
      try {
        id = sessionStorage.getItem(`shopbonus.support.conversation.${session?.user.id}.${mode}.${workspaceId ?? "consumer"}.${locale}`);
      } catch {
        id = null;
      }
      if (!id) {
        try {
          const list = await listSupportConversations(locale);
          const matching = list.filter((c) => c.locale === locale && (mode === "consumer" ? c.workspace_id == null : c.workspace_id === workspaceId));
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
        if (!cancelled) setError(copy("Dit gesprek is niet beschikbaar of verlopen."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session?.user, initialConversationId, mode, workspaceId, locale, hydrateConversation, copy]);

  useEffect(() => {
    if (!conversationId) return;
    try {
      sessionStorage.setItem(`shopbonus.support.conversation.${session?.user.id}.${mode}.${workspaceId ?? "consumer"}`, conversationId);
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
  }, [conversationId, mode, session?.user.id, workspaceId, locale]);

  useEffect(() => {
    scrollToBottom();
  }, [bubbles, progress, scrollToBottom]);

  const applyAssistantMessage = useCallback((msg: SupportMessage) => {
    if (msg.display) displayRef.current = msg.display;
    const answer = answerFromMessage(msg);
    const action = actionFromMessage(msg);
    const terminal = TERMINAL_STATUSES.has(msg.status);
    if (!terminal && !answer) return;
    if (pendingIdRef.current === msg.id) {
      setProgress(null);
      setBusy(false);
      pendingIdRef.current = null;
      idempotencyRef.current = null;
    }
    setBubbles((prev) => {
      const withoutPending = prev.filter((b) => !(b.kind === "assistant" && b.pending && b.id === msg.id));
      const existingIdx = withoutPending.findIndex((b) => b.kind === "assistant" && b.id === msg.id);
      const bubble: ChatBubble = {
        kind: "assistant",
        id: msg.id,
        text:
          answer ||
          (msg.status === "ESCALATED"
            ? copy("Een medewerker is gevraagd om mee te kijken.")
            : msg.status === "NEEDS_CLARIFICATION"
              ? copy("Ik heb nog één gerichte vraag nodig om verder te helpen.")
              : copy("We konden dit nu niet veilig beantwoorden. Je kunt contact opnemen met support.")),
        status: msg.status,
        verified: displayRef.current.show_verified_badge && isVerifiedStatus(msg.status),
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
  }, [copy]);

  useEffect(() => {
    if (!conversationId) return;
    let disposed = false;
    let unsub: (() => void) | undefined;
    void subscribeSupportConversation(conversationId, (event, payload) => {
      if (disposed) return;
      const progressText = progressCopy(locale, event);
      if (progressText && displayRef.current.show_progress_updates) {
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
    }, (connected) => {
      if (disposed) return;
      setLiveUpdates(connected);
      if (connected && !submittingRef.current) void hydrateConversation(conversationId).catch(() => undefined);
    }).then((fn) => {
      if (disposed) fn();
      else unsub = fn;
    });
    return () => {
      disposed = true;
      unsub?.();
    };
  }, [conversationId, locale, hydrateConversation, applyAssistantMessage]);

  useEffect(() => {
    if (!conversationId) return;
    let disposed = false;
    let fetching = false;
    let lastSync = 0;
    const refresh = async (force = false) => {
      if (disposed || fetching || submittingRef.current || document.visibilityState === "hidden") return;
      if (!force && Date.now() - lastSync < (pendingIdRef.current ? 3000 : 15000)) return;
      fetching = true;
      lastSync = Date.now();
      try { await hydrateConversation(conversationId); } catch { /* Retry on the next interval. */ }
      finally { fetching = false; }
    };
    const timer = window.setInterval(() => void refresh(), 3000);
    const catchUp = () => void refresh(true);
    window.addEventListener("online", catchUp);
    window.addEventListener("focus", catchUp);
    document.addEventListener("visibilitychange", catchUp);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("online", catchUp);
      window.removeEventListener("focus", catchUp);
      document.removeEventListener("visibilitychange", catchUp);
    };
  }, [conversationId, hydrateConversation]);

  const pollUntilDone = useCallback(
    async (messageId: string) => {
      let attempts = 0;
      while (attempts < 48 && liveRef.current && pendingIdRef.current === messageId) {
        await new Promise((r) => setTimeout(r, 900));
        if (!liveRef.current || pendingIdRef.current !== messageId) return;
        try {
          const msg = await fetchSupportMessage(messageId, locale);
          const statusProgress = progressCopy(locale, msg.status);
          if (statusProgress && displayRef.current.show_progress_updates) setProgress(statusProgress);
          if (TERMINAL_STATUSES.has(msg.status)) {
            applyAssistantMessage(msg);
            return;
          }
        } catch {
          /* keep polling briefly */
        }
        attempts += 1;
      }
      if (liveRef.current && pendingIdRef.current === messageId) {
        setProgress(null);
      }
    },
    [locale, applyAssistantMessage]
  );

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy || !session?.user) return;
      sendGenerationRef.current += 1;
      submittingRef.current = true;
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
        if (started.display) displayRef.current = started.display;
        setProgress(displayRef.current.show_progress_updates ? progressCopy(locale, started.status) ?? null : null);
        setConversationId(started.conversation_id);
        pendingIdRef.current = started.id;
        setBubbles((prev) => [
          ...prev,
          {
            kind: "assistant",
            id: started.id,
            text: "",
            status: started.status,
            progress: displayRef.current.show_progress_updates ? progressCopy(locale, started.status) : null,
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
        setError(err instanceof ApiError ? err.message : copy("Support is tijdelijk niet beschikbaar."));
      } finally {
        submittingRef.current = false;
      }
    },
    [busy, session?.user, conversationId, mode, workspaceId, locale, pollUntilDone, copy]
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
      setError(err instanceof ApiError ? err.message : copy("Feedback kon niet worden opgeslagen."));
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
      setError(err instanceof ApiError ? err.message : copy("Feedback kon niet worden opgeslagen."));
    }
  };

  const reservedMinor = reservedFromWallet(wallet);
  const availableMinor = walletState === "ready" ? wallet?.available_minor : null;

  const pageHeading =
    mode === "consumer"
      ? locale === "en"
        ? "Ask ShopBonus"
        : "Vraag ShopBonus"
      : "Support";

  const faqItems = useMemo(() => {
    if (faq.length === 0) return faqFallback.map((q) => ({ title: copy(q), id: q }));
    return faq.map((h) => ({
      title: (h.question || h.content || "FAQ").slice(0, 80),
      id: h.document_id,
    }));
  }, [faq, faqFallback, copy]);

  if (!ready) {
    return <p className="p-8 text-sm text-muted">{copy("Laden…")}</p>;
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-navy">{copy("Log in voor Support")}</h1>
        <p className="mt-2 text-muted">{copy("ShopBonus-klantenservice is beschikbaar na inloggen.")}</p>
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
              ? (locale === "en" ? "Ask about funding, campaigns or integrations in this workspace." : "Stel je vraag over financiering, campagnes of integraties in deze webshop.")
              : (locale === "en" ? "Ask about your ShopBonus credit, vouchers or account." : "Stel je vraag over je ShopBonus-tegoed, vouchers of je account.")}
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
                  <p className="truncate text-sm font-extrabold text-navy">{copy("ShopBonus klantenservice")}</p>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <span className={`h-2 w-2 rounded-full ${liveUpdates ? "bg-emerald-500" : "bg-amber-400"}`} />
                    {liveUpdates ? copy("Live updates") : copy("Periodieke updates")}
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
                  {copy("Stel je vraag hieronder. Antwoorden zijn gebaseerd op geverifieerde accountgegevens.")}
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
                          {copy("Medewerker")}
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
                        <p className="font-semibold text-muted">{b.progress || progress || copy("Bezig…")}</p>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap leading-relaxed">{b.text}</p>
                          {b.verified && (
                            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              <span aria-hidden>✓</span> {copy("Gecontroleerd met je accountgegevens")}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              aria-label={copy("Nuttig")}
                              disabled={b.feedback !== null && b.feedback !== undefined}
                              onClick={() => void submitFeedback(b.id, "up")}
                              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-muted hover:bg-slate-50 disabled:opacity-50"
                            >
                              👍
                            </button>
                            <button
                              type="button"
                              aria-label={copy("Niet nuttig")}
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
                                  ? copy("Doorgestuurd naar support")
                                  : copy("Neem contact op met support")}
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
                  placeholder={copy("Stel je vraag over ShopBonus...")}
                  className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium text-navy outline-none"
                  aria-label={copy("Bericht")}
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => void send(draft)}
                  disabled={busy || !draft.trim()}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-50"
                  aria-label={copy("Verstuur")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 12h12M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={copy(s.label)}
                    type="button"
                    onClick={() => void send(copy(s.text))}
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
                <h2 className="text-sm font-extrabold text-navy">{copy("Mijn ShopBonus-tegoed")}</h2>
                {walletState === "loading" && <p role="status">{copy("Wallet laden…")}</p>}
                {walletState === "error" && <p role="alert">{copy("Walletgegevens niet beschikbaar.")} <button type="button" onClick={() => setWalletRetry((n) => n + 1)}>{copy("Opnieuw proberen")}</button></p>}
                {walletState === "ready" && availableMinor === 0 && reservedMinor === 0 && <p>{copy("Geen beschikbaar of gereserveerd saldo.")}</p>}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-2xl font-black text-navy">{availableMinor == null ? "—" : formatMinor(availableMinor)}</p>
                    <p className="text-xs font-semibold text-muted">{copy("Beschikbaar")}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-navy">{walletState !== "ready" || reservedMinor == null ? "—" : formatMinor(reservedMinor)}</p>
                    <p className="text-xs font-semibold text-muted">{copy("Gereserveerd")}</p>
                  </div>
                </div>
                {walletState === "ready" && reservedMinor !== null && reservedMinor > 0 && (
                  <p className="mt-4 flex gap-2 rounded-xl bg-mist px-3 py-2 text-xs font-medium text-muted">
                    <span aria-hidden>⏱</span>
                    {copy("Dit is het gereserveerde deel van je walletsaldo.")}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-[20px] border border-blue-100/80 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-extrabold text-navy">
                  {workspaceSummary?.title || copy("Webshopoverzicht")}
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {(workspaceSummary?.lines || [copy("Alleen geautoriseerde webshopgegevens worden getoond.")]).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-[20px] border border-blue-100/80 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-extrabold text-navy">{copy("Veelgestelde vragen")}</h2>
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
                  <p className="text-sm font-bold text-navy">{copy("Kom je er niet uit? Ons team staat voor je klaar.")}</p>
                  <a
                    href="mailto:support@shopbonus.nl"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold text-brand"
                  >
                    {copy("Neem contact op met support")} →
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
            <h3 className="text-lg font-extrabold text-navy">{copy("Wat klopte er niet?")}</h3>
            <label className="mt-3 block text-sm font-bold text-navy">
              {copy("Reden")}
              <select
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
                value={downvoteReason}
                onChange={(e) => setDownvoteReason(e.target.value as FeedbackPayloadReason)}
              >
                <option value="incorrect_information">{copy("Onjuiste informatie")}</option>
                <option value="did_not_answer">{copy("Vraag niet beantwoord")}</option>
                <option value="outdated_information">{copy("Verouderd")}</option>
                <option value="unclear">{copy("Onduidelijk")}</option>
                <option value="other">{copy("Anders")}</option>
              </select>
            </label>
            <label className="mt-3 block text-sm font-bold text-navy">
              {copy("Toelichting")}
              <textarea
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2 text-sm"
                rows={3}
                value={downvoteComment}
                onChange={(e) => setDownvoteComment(e.target.value)}
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold" onClick={() => setDownvoteFor(null)}>
                {copy("Annuleren")}
              </button>
              <button type="button" className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white" onClick={() => void confirmDownvote()}>
                {copy("Verstuur")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}