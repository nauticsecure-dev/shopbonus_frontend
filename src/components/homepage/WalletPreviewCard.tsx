"use client";

import Link from "next/link";
import { formatMinor } from "@/lib/money";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";
import type { HomepageContent } from "@/lib/homepageDefaults";

type Props = {
  content: HomepageContent["wallet_preview"];
};

const DEFAULT_GOAL_MINOR = 5000;

export default function WalletPreviewCard({ content }: Props) {
  const { session, ready } = useSession();
  const { availableMinor, savingsGoal, walletReady } = useShopBonus();

  if (!ready) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-7">
        <div className="h-6 w-48 animate-pulse rounded bg-blue-50" />
        <div className="mt-5 h-32 animate-pulse rounded-2xl bg-blue-50" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-7" data-testid="wallet-preview-guest">
        <h3 className="text-xl font-black text-navy">{content.heading}</h3>
        <div className="mt-5 rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 p-5">
          <p className="text-sm leading-relaxed text-navy/80">{content.guest_text}</p>
          <Link
            href={content.guest_cta.href}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-brand-dark"
          >
            {content.guest_cta.label}
            <ArrowIcon />
          </Link>
          <p className="mt-4 text-xs font-semibold text-muted">
            Cashback spaar je uitsluitend voor vouchers bij aangesloten webshops.
          </p>
        </div>
      </div>
    );
  }

  const goalMinor = savingsGoal?.target_minor ?? DEFAULT_GOAL_MINOR;
  const remaining = Math.max(0, goalMinor - availableMinor);
  const progress = Math.min(100, Math.round((availableMinor / Math.max(goalMinor, 1)) * 100));
  const goalLabel = savingsGoal?.label ?? `cadeaubon van ${formatMinor(goalMinor)}`;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-7" data-testid="wallet-preview-auth">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-black text-navy">{content.heading}</h3>
        <Link
          href={content.transactions_cta.href}
          className="flex items-center gap-1 text-sm font-bold text-brand hover:underline"
        >
          {content.transactions_cta.label}
          <ArrowIcon />
        </Link>
      </div>

      <div className="mt-5 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand shadow-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="6" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="2" />
                <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
                <circle cx="16.5" cy="14.5" r="1.4" fill="currentColor" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-bold text-muted">Huidig saldo</p>
              <p className="text-3xl font-black tracking-tight text-navy" data-testid="wallet-available">
                {walletReady ? formatMinor(availableMinor) : "…"}
              </p>
            </div>
          </div>
          <Link
            href={content.voucher_cta.href}
            className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-green-600"
          >
            {content.voucher_cta.label}
            <ArrowIcon />
          </Link>
        </div>

        {goalMinor > 0 && (
          <div className="mt-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy">
              <GiftIcon />
              {remaining > 0
                ? `Nog ${formatMinor(remaining)} sparen voor een ${goalLabel}`
                : `Je hebt genoeg voor een ${goalLabel}`}
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-extrabold text-navy">{progress}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-600" aria-hidden>
      <rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13M12 8s-4 0-5.5-1.5A1.5 1.5 0 0 1 8 4c1 0 3 2 4 4Zm0 0s4 0 5.5-1.5A1.5 1.5 0 0 0 16 4c-1 0-3 2-4 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
