"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { fetchCheckout, type CheckoutResult } from "@/lib/benefits";
import { formatMinor } from "@/lib/money";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";

/**
 * Mollie return URL target (`/checkout/{public_id}`).
 * Frontend redirect alone never issues a voucher — we poll verified status.
 */
export default function CheckoutStatusPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { locale } = useLocale();
  const { session, ready } = useSession();
  const { refreshWallet, refreshVouchers, pushToast } = useShopBonus();

  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!session?.user) {
      router.replace(`/account?mode=login&next=${encodeURIComponent(`/checkout/${id}`)}`);
    }
  }, [ready, session, router, id]);

  const load = useCallback(async () => {
    if (!id || !session?.user) return;
    try {
      const data = await fetchCheckout(id, locale);
      setCheckout(data);
      setError(null);
      if (data.state === "completed") {
        await refreshWallet();
        await refreshVouchers("all");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkout kon niet worden geladen.");
    }
  }, [id, session?.user, locale, refreshWallet, refreshVouchers]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!checkout || checkout.state !== "pending_payment") return;
    if (polls >= 40) return;
    const t = window.setTimeout(() => {
      setPolls((p) => p + 1);
      void load();
    }, 2500);
    return () => window.clearTimeout(t);
  }, [checkout, polls, load]);

  useEffect(() => {
    if (checkout?.state === "completed" && checkout.voucher_id) {
      pushToast({ title: "Betaling geslaagd", message: "Je voucher staat klaar.", kind: "success" });
    }
  }, [checkout?.state, checkout?.voucher_id, pushToast]);

  if (!ready || !session) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted" role="status">
        Checkout laden…
      </div>
    );
  }

  if (error && !checkout) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-navy">Checkout niet gevonden</h1>
        <p className="mt-2 text-muted">{error}</p>
        <Link href="/mijn-voordelen" className="mt-6 inline-flex rounded-2xl bg-brand px-6 py-3 font-extrabold text-white">
          Naar Mijn vouchers
        </Link>
      </div>
    );
  }

  const state = checkout?.state ?? "pending_payment";
  const title =
    state === "completed"
      ? "Voucher klaar"
      : state === "pending_payment"
        ? "Betaling verwerken…"
        : state === "paid_unfulfilled"
          ? "Betaling ontvangen — oplossing volgt"
          : state === "expired"
            ? "Checkout verlopen"
            : "Betaling niet afgerond";

  const body =
    state === "completed"
      ? "Je betaling is bevestigd en de voucher is uitgegeven. De code vind je in Mijn vouchers."
      : state === "pending_payment"
        ? "We wachten op bevestiging van Mollie. Deze pagina vernieuwt automatisch. Een redirect is geen bewijs van betaling."
        : state === "paid_unfulfilled"
          ? "Je betaling is gelukt, maar de voucher kon niet meteen worden toegekend. Ons team lost dit gecontroleerd op (terugbetaling of compensatie). Je hoeft niets opnieuw te betalen."
          : state === "expired"
            ? "Deze checkout is verlopen. Er is geen voucher uitgegeven en gereserveerd tegoed is vrijgegeven."
            : `De betaling is ${checkout?.payment?.status ?? "mislukt"}. Er is geen voucher uitgegeven.`;

  return (
    <div className="relative overflow-hidden">
      <div className="page-blob left-[-60px] top-[-30px] h-64 w-64 bg-blue-200/40" />
      <div className="relative mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-[1.75rem] bg-white p-8 text-center shadow-[0_10px_36px_-16px_rgba(10,27,63,0.22)]">
          <p className="text-sm font-bold uppercase tracking-wide text-brand">ShopBonus checkout</p>
          <h1 className="mt-2 text-3xl font-black text-navy">{title}</h1>
          <p className="mt-3 text-muted">{body}</p>

          {checkout && (
            <dl className="mt-6 space-y-2 rounded-2xl bg-mist px-4 py-3 text-left text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Referentie</dt>
                <dd className="truncate font-mono text-xs font-semibold text-navy">{checkout.id}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Tegoed</dt>
                <dd className="font-extrabold text-navy">{formatMinor(checkout.wallet_part_minor)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Mollie</dt>
                <dd className="font-extrabold text-navy">{formatMinor(checkout.payment_part_minor)}</dd>
              </div>
              {checkout.offer?.title && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Aanbieding</dt>
                  <dd className="font-semibold text-navy">{checkout.offer.title}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="mt-8 flex flex-col gap-3">
            {state === "completed" && (
              <Link
                href={
                  checkout?.voucher_id
                    ? `/mijn-voordelen?voucher=${encodeURIComponent(checkout.voucher_id)}`
                    : "/mijn-voordelen"
                }
                className="rounded-2xl bg-brand py-3.5 font-extrabold text-white"
              >
                Bekijk voucher
              </Link>
            )}
            {state === "pending_payment" && checkout?.payment?.checkout_url && (
              <a
                href={checkout.payment.checkout_url}
                className="rounded-2xl bg-brand py-3.5 font-extrabold text-white"
              >
                Terug naar Mollie
              </a>
            )}
            {(state === "failed" || state === "expired") && checkout?.offer?.slug && (
              <Link
                href={`/afrekenen/${encodeURIComponent(checkout.offer.slug)}`}
                className="rounded-2xl bg-brand py-3.5 font-extrabold text-white"
              >
                Opnieuw proberen
              </Link>
            )}
            <Link
              href="/mijn-voordelen"
              className="rounded-2xl border border-blue-100 py-3 font-extrabold text-navy hover:bg-mist"
            >
              Mijn vouchers
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              className="text-sm font-bold text-brand hover:underline"
            >
              Status vernieuwen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
