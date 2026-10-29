export type WalletSummary = {
  available_minor: number;
  total_earned_minor: number;
  total_spent_minor: number;
  currency: string;
  unit: string;
  updated_at?: string;
  savings_goal?: { target_minor: number; label?: string } | null;
  balances?: {
    eur_credit?: {
      available: number;
      total_earned: number;
      total_spent: number;
    };
  };
};

export type VoucherCard = {
  id: string;
  voucher_id?: string;
  status: string;
  status_raw?: string;
  title?: string | null;
  summary?: string | null;
  merchant_name?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  minimum_order_minor?: number | null;
  min_order_minor?: number | null;
  maximum_discount_minor?: number | null;
  max_discount_minor?: number | null;
  expires_at?: string | null;
  days_left?: number | null;
  code_masked?: string;
  can_copy_code?: boolean;
  gift_supported?: boolean;
  webshop?: {
    name?: string | null;
    slug?: string | null;
    logo_url?: string | null;
    categories?: string[];
  };
  code?: string | null;
  terms?: Record<string, unknown>;
  website_url?: string | null;
  instructions?: string | null;
};

export type LedgerRow = {
  id: string;
  type: string;
  ledger_type?: string;
  amount: number;
  amount_minor?: number;
  title?: string;
  subtitle?: string | null;
  merchant_name?: string | null;
  description?: string | null;
  created_at: string;
  sign?: "credit" | "debit";
  status?: string;
};

export type Envelope<T> = {
  data: T;
  meta?: { current_page: number; last_page: number; total: number; per_page?: number };
};
