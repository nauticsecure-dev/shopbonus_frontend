"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { consumerActivityStatus } from "@/i18n/consumerActivityCopy";
import { fetchTransactions, type LedgerEntry } from "@/lib/benefits";
import { useShopBonus } from "@/store/ShopBonusContext";

/** Mounted per account/locale by the dashboard; never falls back to EUR amounts. */
export default function ConsumerPointsOverview() {
  const { locale, intlLocale, dictionary: c } = useLocale();
  const { pointsBalance, walletReady, walletError, financialRevision, refreshWallet } = useShopBonus();
  const [retry, setRetry] = useState(0);
  const key = `${locale}:${financialRevision}:${retry}`;
  const [result, setResult] = useState<{ key: string; rows: LedgerEntry[] | null } | null>(null);
  const activity = result?.key === key ? result.rows : null;
  const activityError = result?.key === key && result.rows === null;
  useEffect(() => {
    let cancelled = false;
    void fetchTransactions({ unit: "points", per_page: 5 }, locale).then(result => {
      if (!Array.isArray(result.data) || result.data.some(row => row.unit !== "points" || !Number.isSafeInteger(row.amount))) throw new Error("Invalid points activity");
      if (!cancelled) setResult({ key, rows: result.data });
    }).catch(() => {
      if (!cancelled) setResult({ key, rows: null });
    });
    return () => { cancelled = true; };
  }, [locale, key]);
  const amount = (value: number) => `${value.toLocaleString(intlLocale)} ${c.benefitsPointsUnit}`;
  return (
    <section aria-label={c.benefitsPoints} className="mb-6 rounded-3xl border border-blue-100 bg-white p-6">
      <h2 className="text-lg font-black text-navy">{c.benefitsPoints}</h2>
      {walletReady && !walletError && pointsBalance ? (
        <>
          <p className="mt-2 text-4xl font-black text-navy">{amount(pointsBalance.available)}</p>
          <p className="text-sm font-bold">{c.benefitsAvailable}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {([
              [c.benefitsPointsPending, pointsBalance.pending],
              [c.benefitsPointsReserved, pointsBalance.reserved],
              [c.benefitsEarnedTotal, pointsBalance.total_earned],
              [c.benefitsSpentTotal, pointsBalance.total_spent],
            ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="font-bold">{amount(value)}</dd></div>)}
          </dl>
        </>
      ) : <p role="status">{c.benefitsPointsUnavailable} <button className="font-bold text-brand" onClick={() => void refreshWallet()}>{c.benefitsRetry}</button></p>}
      <p className="mt-3 text-sm text-muted">{c.benefitsPointsExplanation}</p>
      <h3 className="mt-5 font-bold">{c.benefitsPointsActivity}</h3>
      {activityError ? <p role="alert">{c.benefitsLedgerError} <button onClick={() => setRetry(n => n + 1)}>{c.benefitsRetry}</button></p> : activity === null ? <p role="status">{c.benefitsLoadingShort}</p> : (
        <ul className="mt-2 space-y-2">
          {activity.length === 0 && <li>{c.benefitsEmptyActivity}</li>}
          {activity.map(row => <li key={row.id} className="flex justify-between gap-3 text-sm"><span>{row.title}<small className="block">{consumerActivityStatus(row.status, locale)}</small></span><strong>{row.sign === "debit" ? "−" : "+"} {amount(Math.abs(row.amount))}</strong></li>)}
        </ul>
      )}
    </section>
  );
}
