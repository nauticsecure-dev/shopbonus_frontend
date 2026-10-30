import { apiRequest, apiUpload } from "@/lib/api";
import type { Locale } from "@/types/locale";

export type WalletSummary = {
  available_minor: number;
  reserved_minor?: number;
  pending_minor?: number;
  /** Pending affiliate cashback — visible but not spendable. */
  pending_cashback_minor?: number;
  total_earned_minor: number;
  total_spent_minor: number;
  currency: string;
  unit: string;
  updated_at: string;
  withdrawable?: boolean;
  notice?: string | null;
  savings_goal?: { target_minor: number; label?: string } | null;
  balances?: Record<string, unknown>;
};

export type VoucherStatusLabel = "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED" | string;

export type ConsumerVoucher = {
  id: string;
  voucher_id: string;
  status: VoucherStatusLabel;
  status_raw: string;
  origin?: string;
  code_masked: string;
  can_copy_code: boolean;
  can_report_problem: boolean;
  gift_supported: boolean;
  webshop: {
    name: string | null;
    slug: string | null;
    logo_url: string | null;
    categories: string[];
  };
  merchant_name: string | null;
  title: string | null;
  summary: string | null;
  discount_type: string | null;
  discount_value: number | null;
  minimum_order_minor: number | null;
  min_order_minor: number | null;
  maximum_discount_minor: number | null;
  max_discount_minor: number | null;
  issued_at: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  days_left: number | null;
  expires_soon?: boolean;
  code?: string | null;
  code_visible?: boolean;
  instructions?: string;
  website_url?: string | null;
  terms?: Record<string, unknown>;
  purchase?: {
    checkout_id?: string;
    price_minor?: number;
    wallet_part_minor?: number;
    payment_part_minor?: number;
  } | null;
  redemption?: { at?: string; source?: string | null } | null;
};

export type LedgerFilter = "all" | "earned" | "spent" | "adjustments" | "holds" | "pending";

export type LedgerEntry = {
  id: string;
  type: string;
  ledger_type?: string;
  amount: number;
  amount_minor: number;
  currency: string | null;
  unit: string;
  status: string;
  title: string;
  subtitle: string | null;
  merchant_name: string | null;
  sign: "credit" | "debit";
  description?: string | null;
  created_at: string;
  source?: { type: string | null; ref: string | null };
};

export type PageMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type CheckoutQuote = {
  price_minor: number;
  currency: string;
  wallet_available: number;
  wallet_part_minor: number;
  payment_part_minor: number;
  shortfall_minor?: number;
  validity_days?: number | null;
  blockers: string[];
};

export type CheckoutResult = {
  id: string;
  state: string;
  offer: { slug: string | null; title: string | null };
  price_minor: number;
  wallet_part_minor: number;
  payment_part_minor: number;
  currency: string;
  voucher_id: string | null;
  failure_reason: string | null;
  expires_at?: string | null;
  completed_at?: string | null;
  payment?: {
    provider?: string;
    checkout_url?: string | null;
    status?: string;
    test_mode?: boolean;
  } | null;
};

export type DisputeReason =
  | "code_invalid"
  | "code_already_used"
  | "refused_by_webshop"
  | "terms_differ"
  | "missing_after_payment"
  | "other";

export type ConsumerDispute = {
  id: string;
  status: string;
  reason: string;
  description: string;
  has_screenshot?: boolean;
  webshop?: string | null;
  voucher_id?: string | null;
  checkout_id?: string | null;
  created_at?: string | null;
  timeline?: { type: string; at?: string; note?: string | null }[];
};

type Data<T> = { data: T };

export async function fetchMeWallet(locale?: Locale): Promise<WalletSummary> {
  const res = await apiRequest<Data<WalletSummary>>({ path: "/api/v1/me/wallet", locale });
  return res.data;
}

export async function fetchConsumerWallet(locale?: Locale): Promise<WalletSummary> {
  const res = await apiRequest<Data<WalletSummary>>({ path: "/api/v1/consumer/wallet", locale });
  return res.data;
}

export async function fetchVouchers(
  filter: "all" | "active" | "used" | "expired" | "cancelled" = "all",
  locale?: Locale
): Promise<ConsumerVoucher[]> {
  const q = filter === "all" ? "" : `?filter=${encodeURIComponent(filter)}`;
  const res = await apiRequest<Data<ConsumerVoucher[]>>({
    path: `/api/v1/consumer/vouchers${q}`,
    locale,
  });
  return res.data;
}

export async function fetchVoucherDetail(id: string, locale?: Locale): Promise<ConsumerVoucher> {
  const res = await apiRequest<Data<ConsumerVoucher>>({
    path: `/api/v1/consumer/vouchers/${encodeURIComponent(id)}`,
    locale,
  });
  return res.data;
}

export async function fetchTransactions(
  opts: { filter?: LedgerFilter; q?: string; page?: number; per_page?: number } = {},
  locale?: Locale
): Promise<{ data: LedgerEntry[]; meta: PageMeta }> {
  const params = new URLSearchParams();
  if (opts.filter && opts.filter !== "all") params.set("filter", opts.filter);
  if (opts.q) params.set("q", opts.q);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.per_page) params.set("per_page", String(opts.per_page));
  const qs = params.toString();
  return apiRequest({
    path: `/api/v1/consumer/wallet/transactions${qs ? `?${qs}` : ""}`,
    locale,
  });
}

export async function fetchTransaction(id: string, locale?: Locale): Promise<LedgerEntry> {
  const res = await apiRequest<Data<LedgerEntry>>({
    path: `/api/v1/consumer/wallet/transactions/${encodeURIComponent(id)}`,
    locale,
  });
  return res.data;
}

export async function quoteCheckout(
  offer: string,
  useWallet = true,
  locale?: Locale
): Promise<CheckoutQuote> {
  const res = await apiRequest<Data<CheckoutQuote>>({
    path: "/api/v1/consumer/checkouts/quote",
    method: "POST",
    body: { offer, use_wallet: useWallet },
    locale,
  });
  return res.data;
}

export async function startCheckout(
  offer: string,
  idempotencyKey: string,
  useWallet = true,
  locale?: Locale
): Promise<CheckoutResult> {
  const res = await apiRequest<Data<CheckoutResult>>({
    path: "/api/v1/consumer/checkouts",
    method: "POST",
    body: { offer, use_wallet: useWallet },
    headers: { "Idempotency-Key": idempotencyKey },
    locale,
  });
  return res.data;
}

export async function fetchCheckout(id: string, locale?: Locale): Promise<CheckoutResult> {
  const res = await apiRequest<Data<CheckoutResult>>({
    path: `/api/v1/consumer/checkouts/${encodeURIComponent(id)}`,
    locale,
  });
  return res.data;
}

export async function createDispute(
  body: {
    voucher_id?: string;
    checkout_id?: string;
    reason: DisputeReason | string;
    description: string;
    screenshot?: File | null;
  },
  locale?: Locale
): Promise<ConsumerDispute> {
  if (body.screenshot) {
    const form = new FormData();
    if (body.voucher_id) form.append("voucher_id", body.voucher_id);
    if (body.checkout_id) form.append("checkout_id", body.checkout_id);
    form.append("reason", body.reason);
    form.append("description", body.description);
    form.append("screenshot", body.screenshot);
    const res = await apiUpload<Data<ConsumerDispute>>({
      path: "/api/v1/consumer/disputes",
      method: "POST",
      formData: form,
      locale,
    });
    return res.data;
  }
  const res = await apiRequest<Data<ConsumerDispute>>({
    path: "/api/v1/consumer/disputes",
    method: "POST",
    body: {
      voucher_id: body.voucher_id,
      checkout_id: body.checkout_id,
      reason: body.reason,
      description: body.description,
    },
    locale,
  });
  return res.data;
}

export async function fetchDisputes(locale?: Locale): Promise<ConsumerDispute[]> {
  const res = await apiRequest<Data<ConsumerDispute[]>>({
    path: "/api/v1/consumer/disputes",
    locale,
  });
  return res.data;
}

export async function fetchDispute(id: string, locale?: Locale): Promise<ConsumerDispute> {
  const res = await apiRequest<Data<ConsumerDispute>>({
    path: `/api/v1/consumer/disputes/${encodeURIComponent(id)}`,
    locale,
  });
  return res.data;
}

export type AffiliateActivityItem = {
  id: string;
  webshop: string | null;
  purchased_at: string;
  order_amount_minor: number | null;
  currency: string | null;
  status: string;
  explanation: string | null;
  reward: { amount: number; unit: string; status: string } | null;
};

export async function fetchAffiliateActivity(
  locale?: Locale
): Promise<{ data: AffiliateActivityItem[]; meta: PageMeta; notice?: string }> {
  const params = new URLSearchParams();
  if (locale) params.set("locale", locale);
  const qs = params.toString();
  return apiRequest({
    path: `/api/v1/consumer/affiliate-activity${qs ? `?${qs}` : ""}`,
    locale,
  });
}

export type AiChatStart = {
  id: string;
  conversation_id: string;
  status: string;
};

export async function startAiChat(
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
): Promise<AiChatStart> {
  const res = await apiRequest<Data<AiChatStart>>({
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

export type AiMessage = {
  id: string;
  conversation_id?: string;
  status: string;
  question?: string;
  role?: string;
  answer?: string | null;
  content?: string | null;
  text?: string | null;
  verified_answer?: string | null;
  result?: {
    status?: string;
    answer?: string | null;
    evidence_ids?: string[];
    action?: { label: string; route: string } | null;
  } | null;
  retry_used?: boolean;
};

export async function pollAiMessage(id: string, locale?: Locale): Promise<AiMessage> {
  const res = await apiRequest<Data<AiMessage>>({
    path: `/api/v1/ai/messages/${encodeURIComponent(id)}`,
    locale,
  });
  return res.data;
}

export async function fetchAiConversation(
  id: string,
  locale?: Locale
): Promise<{ messages?: AiMessage[]; data?: unknown }> {
  return apiRequest({
    path: `/api/v1/ai/conversations/${encodeURIComponent(id)}`,
    locale,
  });
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
