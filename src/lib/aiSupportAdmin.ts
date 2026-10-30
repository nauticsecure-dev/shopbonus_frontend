import { apiRequest } from "@/lib/api";

type Data<T> = { data: T };

export type SupportAiPolicy = {
  enabled: boolean;
  model: string | null;
  languages: string[];
  daily_request_limit: number;
  timeout_seconds: number;
  max_retry: number;
  restrictions: Array<{
    rule_code: string;
    match_type: string;
    action: string;
    enabled: boolean;
    scope?: string;
  }>;
  default_language?: string;
  tone?: string;
  empathy?: string;
  answer_detail?: string;
  target_answer_words?: number;
  max_answer_words?: number;
  max_clarification_questions?: number;
  show_progress_updates?: boolean;
  show_verified_badge?: boolean;
  suggest_relevant_actions?: boolean;
  human_escalation?: string;
  reasoning_effort?: string;
  text_verbosity?: string;
  max_output_tokens?: number;
  tool_choice?: string;
  parallel_tool_calls?: boolean;
  store?: boolean;
  stream?: boolean;
  response_deadline_ms?: number;
  progress_message_delay_ms?: number;
  max_research_retries?: number;
  max_function_rounds?: number;
  daily_cost_limit_eur?: number;
  fallback_model?: string | null;
};

export type PlatformSettingVersion = {
  id: string;
  key?: string;
  status: string;
  value: SupportAiPolicy | Record<string, unknown>;
  reason?: string;
  checksum?: string;
  created_at?: string;
};

export type PlatformSettingsResponse = {
  data: PlatformSettingVersion[];
  published: {
    values: Record<string, unknown>;
    versions: Record<string, string>;
  };
  allowed_keys: string[];
};

export type OperationsMetrics = {
  from: string;
  checked_at: string;
  sample_size: number;
  statuses: Record<string, number>;
  failures: Record<string, number>;
  retrieval_retries: number;
  latency_p95_ms: number | null;
  input_tokens: number;
  output_tokens: number;
  open_reviews: number;
  approved_regressions: number;
  daily_requests: number;
  circuit_open: boolean;
  broadcaster: string;
  last_successful_broadcast_at: string | null;
  broadcast_failures_last_24h: number;
  policy_version: string;
  cost_notice?: string;
};

export type ReviewListItem = {
  id: string;
  message_id: string;
  trigger: string;
  outcome: string | null;
  reviewed_at: string | null;
};

export type ReviewDetail = {
  id: string;
  conversation_id: string;
  message_id: string;
  question: string;
  result: unknown;
  evidence: unknown;
  research: unknown;
  retry_used: boolean;
  metrics: unknown;
  failure_code: string | null;
  feedback: Array<{ rating: string; reason?: string; comment?: string }>;
  outcome: string | null;
  note: string | null;
  regression_added: boolean;
};

export const DEFAULT_SUPPORT_POLICY: SupportAiPolicy = {
  enabled: true,
  model: "gpt-5.1",
  languages: ["nl", "en"],
  daily_request_limit: 100,
  timeout_seconds: 20,
  max_retry: 1,
  restrictions: [
    { rule_code: "NO_UNVERIFIED_REFUND_PROMISE", match_type: "semantic_claim", action: "BLOCK", enabled: true, scope: "ALL" },
    { rule_code: "NO_UNVERIFIED_RELEASE_DATE", match_type: "semantic_claim", action: "BLOCK", enabled: true, scope: "ALL" },
    { rule_code: "BLOCK_GENERAL_ASSISTANT", match_type: "semantic_claim", action: "BLOCK", enabled: true, scope: "ALL" },
  ],
  default_language: "nl",
  tone: "friendly_professional",
  empathy: "balanced",
  answer_detail: "concise",
  target_answer_words: 45,
  max_answer_words: 120,
  max_clarification_questions: 1,
  show_progress_updates: true,
  show_verified_badge: true,
  suggest_relevant_actions: true,
  human_escalation: "enabled",
  reasoning_effort: "medium",
  text_verbosity: "low",
  max_output_tokens: 1200,
  tool_choice: "required",
  parallel_tool_calls: false,
  store: false,
  stream: false,
  response_deadline_ms: 12000,
  progress_message_delay_ms: 500,
  max_research_retries: 1,
  max_function_rounds: 3,
  daily_cost_limit_eur: 20,
  fallback_model: null,
};

export async function fetchPlatformSettings(key = "support.ai"): Promise<PlatformSettingsResponse> {
  return apiRequest({ path: `/api/v1/admin/platform-settings?key=${encodeURIComponent(key)}&per_page=50` });
}

export async function createSupportPolicyDraft(
  value: SupportAiPolicy,
  reason: string
): Promise<PlatformSettingVersion> {
  const res = await apiRequest<Data<PlatformSettingVersion>>({
    path: "/api/v1/admin/platform-settings",
    method: "POST",
    body: { key: "support.ai", value, reason },
  });
  return res.data;
}

export async function submitSettingForReview(versionId: string): Promise<unknown> {
  return apiRequest({
    path: `/api/v1/admin/platform-settings/${encodeURIComponent(versionId)}/review`,
    method: "POST",
    body: {},
  });
}

export async function publishSettingVersion(versionId: string): Promise<unknown> {
  return apiRequest({
    path: `/api/v1/admin/platform-settings/${encodeURIComponent(versionId)}/publish`,
    method: "POST",
    body: {},
  });
}

export async function rollbackSettingVersion(versionId: string, reason: string): Promise<unknown> {
  return apiRequest({
    path: `/api/v1/admin/platform-settings/${encodeURIComponent(versionId)}/rollback`,
    method: "POST",
    body: { reason },
  });
}

export async function testSupportPolicy(versionId: string): Promise<{
  total: number;
  passed: number;
  failed: number;
  policy_checksum?: string;
  scope?: string;
  provider_verified?: boolean;
}> {
  const res = await apiRequest<
    Data<{
      total: number;
      passed: number;
      failed: number;
      policy_checksum?: string;
      scope?: string;
      provider_verified?: boolean;
    }>
  >({
    path: `/api/v1/admin/ai/settings/${encodeURIComponent(versionId)}/test`,
    method: "POST",
    body: {},
  });
  return res.data;
}

export async function fetchAiOperations(): Promise<OperationsMetrics> {
  const res = await apiRequest<Data<OperationsMetrics>>({ path: "/api/v1/admin/ai/operations" });
  return res.data;
}

export async function fetchAiReviews(outcome = "open"): Promise<ReviewListItem[]> {
  const res = await apiRequest<Data<ReviewListItem[]>>({
    path: `/api/v1/admin/ai/reviews?outcome=${encodeURIComponent(outcome)}`,
  });
  return res.data;
}

export async function fetchAiReview(id: string): Promise<ReviewDetail> {
  const res = await apiRequest<Data<ReviewDetail>>({
    path: `/api/v1/admin/ai/reviews/${encodeURIComponent(id)}`,
  });
  return res.data;
}

export async function resolveAiReview(
  id: string,
  body: {
    outcome: "CONFIRMED_ERROR" | "ANSWER_CORRECT" | "NEEDS_INVESTIGATION";
    note: string;
    expected_intent?: string;
    knowledge_id?: string | null;
  }
): Promise<{ id: string; outcome: string; regression_added: boolean }> {
  const res = await apiRequest<Data<{ id: string; outcome: string; regression_added: boolean }>>({
    path: `/api/v1/admin/ai/reviews/${encodeURIComponent(id)}/resolve`,
    method: "POST",
    body,
  });
  return res.data;
}

export async function replyToConversation(
  conversationId: string,
  body: string
): Promise<{ id: string; sender: string; body: string; created_at: string }> {
  const res = await apiRequest<Data<{ id: string; sender: string; body: string; created_at: string }>>({
    path: `/api/v1/admin/ai/conversations/${encodeURIComponent(conversationId)}/reply`,
    method: "POST",
    body: { body },
  });
  return res.data;
}
