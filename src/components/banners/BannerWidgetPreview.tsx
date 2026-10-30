"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { BannerConfig } from "@/lib/banners";
import { formatMinor } from "@/lib/banners";

type Props = {
  config: BannerConfig;
  selected?: boolean;
  simulatedCart?: { cart_minor: number; threshold_minor: number } | null;
  onSelect?: () => void;
  onMove?: (offsetX: number, offsetY: number) => void;
  device?: "desktop" | "mobile";
};

export default function BannerWidgetPreview({
  config,
  selected,
  simulatedCart,
  onSelect,
  onMove,
  device = "desktop",
}: Props) {
  const place = config.placement;
  const isRibbon = config.template === "ribbon";
  const progress =
    config.template === "cart_progress" && simulatedCart
      ? {
          pct: Math.min(100, Math.floor((simulatedCart.cart_minor * 100) / Math.max(1, simulatedCart.threshold_minor))),
          remaining: Math.max(0, simulatedCart.threshold_minor - simulatedCart.cart_minor),
          cart: simulatedCart.cart_minor,
          thr: simulatedCart.threshold_minor,
        }
      : null;

  const positionStyle: CSSProperties = isRibbon
    ? { top: 12, left: 12, right: 12, transform: `translate(${place.offset_x ?? 0}px, ${place.offset_y ?? 0}px)` }
    : anchorToStyle(place.anchor, place.offset_x ?? 0, place.offset_y ?? 0);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onMove || !selected) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = place.offset_x ?? 0;
    const oy = place.offset_y ?? 0;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      onMove(Math.round(ox + (ev.clientX - startX)), Math.round(oy + (ev.clientY - startY)));
    };
    const up = () => {
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="banner-widget"
      aria-label="ShopBonus widget"
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onKeyDown={(e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") onSelect?.();
      }}
      onPointerDown={onPointerDown}
      className={`absolute z-20 max-w-[min(340px,90%)] cursor-grab select-none rounded-2xl p-4 shadow-xl active:cursor-grabbing ${
        isRibbon ? "mx-auto" : ""
      } ${selected ? "ring-2 ring-dashed ring-brand ring-offset-2" : ""}`}
      style={{
        ...positionStyle,
        background: config.style.background,
        color: config.style.text,
        borderRadius: config.style.radius ?? 16,
        fontSize: device === "mobile" ? 13 : 14,
      }}
    >
      {selected && (
        <>
          <span className="absolute -top-2 left-1/2 h-3 w-8 -translate-x-1/2 rounded-full bg-brand" title="Move" />
          {(["-left-1.5 -top-1.5", "-right-1.5 -top-1.5", "-left-1.5 -bottom-1.5", "-right-1.5 -bottom-1.5"] as const).map(
            (cls) => (
              <span key={cls} className={`absolute h-3 w-3 rounded-full border-2 border-white bg-brand ${cls}`} />
            )
          )}
        </>
      )}
      <div className="mb-2 flex items-start gap-2">
        <span
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-lg"
          aria-hidden
        >
          🎁
        </span>
        <div className="min-w-0">
          <p className="font-extrabold leading-snug">{config.content.heading}</p>
          {config.content.subtitle ? (
            <p className="mt-0.5 text-sm opacity-90">{config.content.subtitle}</p>
          ) : null}
        </div>
      </div>
      {progress ? (
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${progress.pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs font-semibold opacity-95">
            {formatMinor(progress.cart)} of {formatMinor(progress.thr)}
          </p>
          <p className="text-xs font-bold">Only {formatMinor(progress.remaining)} to go!</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/80">Simulated cart</p>
        </div>
      ) : config.template === "cart_progress" ? (
        <p className="mt-2 text-xs opacity-90">{config.content.terms || "Static offer — cart bridge unavailable"}</p>
      ) : null}
      {config.content.cta_label ? (
        <span
          className="mt-3 inline-flex rounded-xl px-3 py-1.5 text-xs font-extrabold"
          style={{ background: config.style.accent || "#fff", color: config.style.background }}
        >
          {config.content.cta_label}
        </span>
      ) : null}
      {config.content.terms && config.template !== "cart_progress" ? (
        <p className="mt-2 text-[11px] opacity-75">{config.content.terms}</p>
      ) : null}
    </div>
  );
}

function anchorToStyle(anchor: string, ox: number, oy: number): CSSProperties {
  const t = `translate(${ox}px, ${oy}px)`;
  switch (anchor) {
    case "top":
      return { top: 16, left: "50%", transform: `translate(-50%, 0) ${t}` };
    case "bottom":
      return { bottom: 16, left: "50%", transform: `translate(-50%, 0) ${t}` };
    case "top_left":
      return { top: 20, left: 20, transform: t };
    case "top_right":
      return { top: 20, right: 20, transform: t };
    case "bottom_left":
      return { bottom: 20, left: 20, transform: t };
    case "inline":
      return { top: "42%", left: "50%", transform: `translate(-50%, -50%) ${t}` };
    default:
      return { bottom: 28, right: 28, transform: t };
  }
}
