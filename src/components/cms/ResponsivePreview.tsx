"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/i18n/LocaleContext";

/** A real browsing viewport keeps media queries, overlays and the component tree together. */
export default function ResponsivePreview({ children, onExit }: { children: ReactNode; onExit?: () => void }) {
  const { locale } = useLocale();
  const [width, setWidth] = useState(1440);
  const frame = useRef<HTMLIFrameElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc || !target) return;
    function copyStyles() {
      if (!doc) return;
      doc.head.querySelectorAll("[data-preview-style]").forEach(node => node.remove());
      document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => { const copy = node.cloneNode(true) as HTMLElement; copy.setAttribute("data-preview-style", ""); doc.head.appendChild(copy); });
      doc.documentElement.lang = locale;
      doc.documentElement.className = document.documentElement.className;
      doc.body.className = document.body.className;
      doc.body.style.margin = "0";
    }
    copyStyles();
    const observer = new MutationObserver(copyStyles);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [target, locale]);
  return <section className="space-y-3" aria-label={locale === "de" ? "Responsive Vorschau" : locale === "nl" ? "Responsief voorbeeld" : "Responsive preview"}>
    <div className="flex flex-wrap gap-2">{([ ["Desktop", 1440], ["Tablet", 768], ["Mobile", 390] ] as const).map(([label, value]) => <button type="button" key={value} className="rounded border bg-white p-2 text-navy" aria-pressed={width === value} onClick={() => setWidth(value)}>{label} · {value}px</button>)}
      {onExit && <button type="button" className="rounded border bg-white p-2 text-navy" onClick={onExit}>{locale === "de" ? "Vorschau schließen" : locale === "nl" ? "Voorbeeld sluiten" : "Close preview"}</button>}
    </div>
    <div className="max-w-full overflow-x-auto border bg-white">
      <iframe ref={frame} title="CMS responsive preview" sandbox="allow-same-origin" style={{ width, height: 900, display: "block", border: 0 }} srcDoc={'<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="cms-preview-root"></div></body></html>'} onLoad={event => setTarget(event.currentTarget.contentDocument?.getElementById("cms-preview-root") ?? null)} />
    </div>
    {target && createPortal(<div onClickCapture={event => { event.preventDefault(); event.stopPropagation(); }} onSubmitCapture={event => { event.preventDefault(); event.stopPropagation(); }}>{children}</div>, target)}
  </section>;
}
