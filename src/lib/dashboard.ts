import { apiRequest } from "@/lib/api";
import type { Locale } from "@/types/locale";
import type { ConsumerVoucher } from "@/lib/benefits";
import type { DiscoveryOfferSummary, DiscoveryWebshopCard } from "@/lib/discovery";

export type ConsumerDashboard = {
  first_name: string | null;
  email_verified: boolean;
  wallet: Record<string, { available: number; pending: number; unit: string }>;
  available_minor: number;
  pending_minor: number;
  total_earned_minor: number;
  total_spent_minor: number;
  vouchers: {
    issued: number;
    redeemed: number;
    expiring_within_30_days: number;
  };
  recent_vouchers: ConsumerVoucher[];
  recent_activity: Array<{
    id: string;
    type: string;
    amount: number;
    reason: string | null;
    at: string | null;
  }>;
  favorites: DiscoveryWebshopCard[];
  relevant_offers: DiscoveryOfferSummary[];
  savings_goal: unknown;
};

type Data<T> = { data: T };

export async function fetchConsumerDashboard(locale?: Locale): Promise<ConsumerDashboard> {
  const res = await apiRequest<Data<ConsumerDashboard>>({
    path: "/api/v1/consumer/dashboard",
    locale,
  });
  return res.data;
}
