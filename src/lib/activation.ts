import { apiRequest } from "@/lib/api";
import type { Locale } from "@/types/locale";

export type ActivationPreview = {
  status: "eligible" | string;
  claim_status: string;
  expires_at: string;
  webshop: { name: string };
  offer: {
    name?: string;
    summary?: string | null;
    public_description?: string | null;
    discount_type?: string | null;
    discount_value?: number | null;
    currency?: string | null;
    min_order_minor?: number | null;
    max_discount_minor?: number | null;
    ends_at?: string | null;
    redemption_validity_days?: number | null;
  };
  requirements: { verified_account: boolean; email_matches_order: boolean };
  explanation: string;
};

export type ActivationResult = {
  status: "activated" | string;
  voucher_id: string;
  voucher_status: string;
  code: string;
  issued_at: string | null;
  expires_at: string | null;
  webshop: { name: string };
  offer: ActivationPreview["offer"];
  dashboard_path: string;
};

type Data<T> = { data: T };

export async function verifyActivation(token: string, locale?: Locale): Promise<ActivationPreview> {
  const res = await apiRequest<Data<ActivationPreview>>({
    path: "/api/v1/consumer/activation/verify",
    method: "POST",
    body: { token },
    locale,
  });
  return res.data;
}

export async function completeActivation(token: string, locale?: Locale): Promise<ActivationResult> {
  const res = await apiRequest<Data<ActivationResult>>({
    path: "/api/v1/consumer/activation/complete",
    method: "POST",
    body: { token },
    locale,
  });
  return res.data;
}
