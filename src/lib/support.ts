import { apiRequest } from "@/lib/api";
import type { Locale } from "@/types/locale";

type Data<T> = { data: T };

export type SupportMessageStatus =
  | "PENDING"
  | "RESEARCHING"
  | "VERIFYING"
  | "RETRYING"
  | "VERIFIED"
  | "PARTIALLY_VERIFIED"
  | "NEEDS_CLARIFICATION"
  | "ESCALATED"
  | "UNAVAILABLE"
  | string;

export type SupportAction = {
  label: string;
  route: string;
};

export type SupportResult = {
  status?: SupportMessageStatus;
  answer?: string | null;
  evidence_ids?: string[];
  checked_at?: string | null;
  action?: SupportAction | null;
};

export type SupportMessage = {
  id: string;
  conversation_id: string;
  question: string;
  status: SupportMessageStatus;
  result: SupportResult | null;
  retry_used?: boolean;
  created_at: string;
  completed_at?: string | null;
};

export type SupportReply = {
  id: string;
  sender: "human_support";
  body: string;
  created_at: string;
};

export type SupportConversationListItem = {
  id: string;
  locale: string;
  workspace_id: string | null;
  expires_at: string;
};

export type SupportConversationDetail = {
  id: string;
  messages: SupportMessage[];
  replies: SupportReply[];
  next_before?: string | null;
};

export type SupportChatStart = {
  id: string;
  conversation_id: string;
  status: SupportMessageStatus;
};

export type KnowledgeHit = {
  document_id: string;
  scope?: string;
  version?: string | number;
  approved_at?: string | null;
  locale?: string;
  content?: string;
  question?: string;
  checked_at?: string;
};

export type FeedbackPayload = {
  rating: "up" | "down";
  reason?: "incorrect_information" | "did_not_answer" | "outdated_information" | "unclear" | "other";
  comment?: string;
};

const PROGRESS_COPY_EN: Record<string, string> = {
  ChatResearchStarted: "Checking account…",
  ChatVerificationStarted: "Verifying…",
  ChatRetryStarted: "Searching again…",
  RESEARCHING: "Checking account…",
  VERIFYING: "Verifying…",
  RETRYING: "Searching again…",
  PENDING: "Received…",
};

const PROGRESS_COPY_NL: Record<string, string> = {
  ChatResearchStarted: "Account controleren…",
  ChatVerificationStarted: "Verifiëren…",
  ChatRetryStarted: "Opnieuw zoeken…",
  RESEARCHING: "Account controleren…",
  VERIFYING: "Verifiëren…",
  RETRYING: "Opnieuw zoeken…",
  PENDING: "Ontvangen…",
};

export function progressCopy(locale: Locale | "nl" | "en", key: string): string | undefined {
  const map = locale === "en" ? PROGRESS_COPY_EN : PROGRESS_COPY_NL;
  return map[key];
}

export const TERMINAL_STATUSES = new Set([
  "VERIFIED",
  "PARTIALLY_VERIFIED",
  "NEEDS_CLARIFICATION",
  "ESCALATED",
  "UNAVAILABLE",
]);

export function answerFromMessage(msg: SupportMessage | null | undefined): string {
  if (!msg) return "";
  const fromResult = msg.result?.answer;
  if (typeof fromResult === "string" && fromResult.trim()) return fromResult.trim();
  return "";
}

export function actionFromMessage(msg: SupportMessage | null | undefined): SupportAction | null {
  const action = msg?.result?.action;
  if (!action || typeof action.route !== "string" || typeof action.label !== "string") return null;
  return action;
}

export function isVerifiedStatus(status: string): boolean {
  return status === "VERIFIED" || status === "PARTIALLY_VERIFIED";
}

export async function listSupportConversations(locale?: Locale): Promise<SupportConversationListItem[]> {
  const res = await apiRequest<Data<SupportConversationListItem[]>>({
    path: "/api/v1/ai/conversations",
    locale,
  });
  return res.data;
}

export async function fetchSupportConversation(
  id: string,
  locale?: Locale,
  before?: string
): Promise<SupportConversationDetail> {
  const q = before ? `?before=${encodeURIComponent(before)}` : "";
  const res = await apiRequest<Data<SupportConversationDetail>>({
    path: `/api/v1/ai/conversations/${encodeURIComponent(id)}${q}`,
    locale,
  });
  return res.data;
}

export async function fetchSupportMessage(id: string, locale?: Locale): Promise<SupportMessage> {
  const res = await apiRequest<Data<SupportMessage>>({
    path: `/api/v1/ai/messages/${encodeURIComponent(id)}`,
    locale,
  });
  return res.data;
}

export async function startSupportChat(
  body: {
    message: string;
    conversation_id?: string;
    workspace_id?: string;
    reference?: string;
    current_page?: string;
    locale?: "nl" | "en";
  },
  idempotencyKey: string,
  requestLocale?: Locale
): Promise<SupportChatStart> {
  const res = await apiRequest<Data<SupportChatStart>>({
    path: "/api/v1/ai/chat",
    method: "POST",
    body: {
      message: body.message,
      conversation_id: body.conversation_id,
      workspace_id: body.workspace_id,
      reference: body.reference,
      current_page: body.current_page ?? "/app/support",
      locale: body.locale ?? "nl",
    },
    headers: { "Idempotency-Key": idempotencyKey },
    locale: requestLocale,
  });
  return res.data;
}

export async function submitSupportFeedback(
  messageId: string,
  payload: FeedbackPayload,
  locale?: Locale
): Promise<{ id: string; rating: string; review_required: boolean }> {
  const res = await apiRequest<Data<{ id: string; rating: string; review_required: boolean }>>({
    path: `/api/v1/ai/messages/${encodeURIComponent(messageId)}/feedback`,
    method: "POST",
    body: payload,
    locale,
  });
  return res.data;
}

export async function escalateSupportMessage(
  messageId: string,
  locale?: Locale
): Promise<{ id: string; status: string; notice: string }> {
  const res = await apiRequest<Data<{ id: string; status: string; notice: string }>>({
    path: `/api/v1/ai/messages/${encodeURIComponent(messageId)}/escalate`,
    method: "POST",
    body: {},
    locale,
  });
  return res.data;
}

export async function searchSupportKnowledge(
  query: string,
  opts: { workspace_id?: string; locale?: "nl" | "en" } = {},
  requestLocale?: Locale
): Promise<KnowledgeHit[]> {
  const res = await apiRequest<Data<KnowledgeHit[]>>({
    path: "/api/v1/ai/knowledge/search",
    method: "POST",
    body: {
      query,
      workspace_id: opts.workspace_id,
      locale: opts.locale ?? "nl",
    },
    locale: requestLocale,
  });
  return res.data;
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Map backend action routes onto Next consumer/workspace paths. */
export function resolveSupportActionHref(route: string): string {
  if (route.startsWith("/app/wallet") || route === "/app/wallet") return "/mijn-voordelen";
  if (route.startsWith("/app/vouchers")) return "/mijn-voordelen?tab=vouchers";
  if (route.startsWith("/app/support")) return route;
  if (route.startsWith("/app/workspaces/")) return "/dashboard";
  return route;
}
