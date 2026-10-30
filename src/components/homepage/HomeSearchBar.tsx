"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { searchPublic, type SearchSuggestion } from "@/lib/homepage";
import { useLocale } from "@/i18n/LocaleContext";

type Props = {
  placeholder?: string;
};

export default function HomeSearchBar({
  placeholder = "Zoek een webshop of aanbieding...",
}: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SearchSuggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [empty, setEmpty] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setEmpty(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      const ac = new AbortController();
      void searchPublic(term, { locale, limit: 8, signal: ac.signal })
        .then((res) => {
          setItems(res.suggestions ?? []);
          setEmpty((res.suggestions ?? []).length === 0);
          setOpen(true);
          setActive(-1);
        })
        .catch(() => {
          setItems([]);
          setEmpty(true);
          setOpen(true);
        })
        .finally(() => setLoading(false));
      return () => ac.abort();
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, locale]);

  function go(href?: string) {
    setOpen(false);
    if (href) {
      router.push(href);
      return;
    }
    router.push(`/webshops?q=${encodeURIComponent(q.trim())}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (items.length) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && items[active]) go(items[active].href);
      else go();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative mx-auto max-w-3xl" data-testid="home-search">
      <form
        role="search"
        className="flex items-center gap-2 rounded-full border border-blue-100 bg-white p-2 shadow-[0_16px_40px_-16px_rgba(10,27,63,0.28)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && items[active]) go(items[active].href);
          else go();
        }}
      >
        <span className="pl-4 text-muted" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.3" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          </svg>
        </span>
        <input
          id="home-search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          role="combobox"
          className="w-full bg-transparent py-2.5 text-[15px] font-medium text-navy placeholder:text-muted/70 focus:outline-none"
        />
        {loading && (
          <span className="pr-2 text-xs font-semibold text-muted" aria-live="polite">
            Zoeken…
          </span>
        )}
        <button
          type="submit"
          className="shrink-0 rounded-full bg-brand px-7 py-3 text-sm font-extrabold text-white transition hover:bg-brand-dark"
        >
          Zoeken
        </button>
      </form>

      {open && (items.length > 0 || empty) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-blue-100 bg-white py-2 shadow-xl"
        >
          {empty && !loading ? (
            <li className="px-4 py-3 text-sm text-muted">Geen resultaten voor “{q.trim()}”.</li>
          ) : (
            items.map((item, i) => (
              <li key={`${item.type}-${item.href}-${item.label}`} role="option" aria-selected={i === active}>
                <button
                  id={`${listId}-${i}`}
                  type="button"
                  className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition ${
                    i === active ? "bg-brand-light" : "hover:bg-blue-50"
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item.href)}
                >
                  <span className="mt-0.5 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand">
                    {item.type === "webshop"
                      ? "Shop"
                      : item.type === "offer"
                        ? "Deal"
                        : item.type === "category"
                          ? "Cat"
                          : item.type === "discount_code"
                            ? "Code"
                            : "Zoek"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-navy">{item.label}</span>
                    {item.subtitle && (
                      <span className="block truncate text-xs text-muted">{item.subtitle}</span>
                    )}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
