"use client";

import { useLocale } from "@/i18n/LocaleContext";
import { updateConsumerProfile } from "@/lib/profile";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/types/locale";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";

export default function LanguageSetting() {
  const { locale, setLocale, dictionary } = useLocale();
  const { session } = useSession();
  const { pushToast } = useShopBonus();

  const onChange = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
    if (session?.user) {
      void updateConsumerProfile({ locale: next }, next).catch(() => {
        /* locale still applies client-side; server sync can retry on next profile save */
      });
    }
    pushToast({
      title: dictionary.languageSaved,
      message: dictionary.languageSavedDetail,
      kind: "success",
    });
  };

  return (
    <div className="rounded-[1.75rem] bg-white p-7 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.2)]">
      <h2 className="text-2xl font-black text-navy">{dictionary.language}</h2>
      <p className="mt-1 text-muted">{dictionary.languageHint}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={dictionary.language}>
        {LOCALES.map((code) => {
          const selected = code === locale;
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(code)}
              className={`rounded-2xl border px-4 py-3.5 text-left transition ${
                selected
                  ? "border-brand bg-brand-light text-navy shadow-sm"
                  : "border-blue-50 bg-white text-navy hover:border-blue-200"
              }`}
            >
              <span className="block text-sm font-extrabold uppercase tracking-wide text-brand">
                {code}
              </span>
              <span className="mt-0.5 block font-extrabold">{LOCALE_LABELS[code]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
