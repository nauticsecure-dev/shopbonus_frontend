"use client";

import { useState } from "react";
import { useRoleCopy } from "@/i18n/roleCopy";
import { resolvePlatformDelivery, retryPlatformDelivery, type PlatformDelivery } from "@/lib/notifications";

export default function NotificationDeliveryActions({ delivery, busy, run }: {
  delivery: PlatformDelivery;
  busy: boolean;
  run: (action: () => Promise<void>, notice: string) => Promise<void>;
}) {
  const c = useRoleCopy();
  const [note, setNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  if (!["failed", "uncertain"].includes(delivery.status)) return null;
  const uncertain = delivery.status === "uncertain";
  const validNote = note.trim().length >= 10 && note.trim().length <= 500;
  const buttonClass = "rounded-lg border border-blue-100 px-3 py-2 text-xs font-extrabold text-brand disabled:opacity-50";
  return (
    <div className="w-full space-y-3" data-testid={`delivery-actions-${delivery.id}`}>
      <label className="block text-sm font-bold text-navy">
        {c("Delivery_review_note")}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} minLength={10}
          disabled={busy} className="mt-1 block w-full rounded-xl border border-blue-100 px-3 py-2" />
      </label>
      {uncertain && <label className="flex items-start gap-2 text-sm text-amber-800">
        <input type="checkbox" checked={acknowledged} disabled={busy} onChange={(e) => setAcknowledged(e.target.checked)} />
        {c("Acknowledge_duplicate_delivery")}
      </label>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass}
          disabled={busy || !validNote || delivery.attempts >= 5 || (uncertain && !acknowledged)}
          onClick={() => void run(async () => {
            await retryPlatformDelivery(delivery.id, note.trim(), uncertain && acknowledged);
          }, c("Delivery_retry_authorized"))}>{c("Retry")}</button>
        {uncertain && <>
          <button type="button" className={buttonClass} disabled={busy || !validNote}
            onClick={() => void run(async () => {
              await resolvePlatformDelivery(delivery.id, note.trim(), "confirmed_sent");
            }, c("Delivery_resolved"))}>{c("Confirm_delivery_sent")}</button>
          <button type="button" className={buttonClass} disabled={busy || !validNote}
            onClick={() => void run(async () => {
              await resolvePlatformDelivery(delivery.id, note.trim(), "do_not_resend");
            }, c("Delivery_resolved"))}>{c("Do_not_resend")}</button>
        </>}
      </div>
    </div>
  );
}
