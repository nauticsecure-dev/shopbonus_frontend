"use client";

import { useShopBonus } from "@/store/ShopBonusContext";

export default function Toasts() {
  const { toasts, dismissToast } = useShopBonus();
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col gap-3 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_20px_50px_-12px_rgba(10,27,63,0.35)]"
        >
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
              t.kind === "success"
                ? "bg-green-100 text-green-700"
                : t.kind === "error"
                  ? "bg-red-100 text-red-600"
                  : "bg-brand-light text-brand"
            }`}
          >
            {t.kind === "success" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : t.kind === "error" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
                <path d="M12 8h.01M12 11v5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-navy">{t.title}</p>
            <p className="truncate text-sm text-muted">{t.message}</p>
          </div>
          <button
            onClick={() => dismissToast(t.id)}
            className="rounded-lg p-1 text-muted hover:bg-slate-100"
            aria-label="Sluiten"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
