"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import HeroIllustration from "./HeroIllustration";
import {
  CmsToolbar,
  EditableText,
  InlineCmsProvider,
  useInlineCms,
} from "./MerchantInlineCms";
import type { MerchantLandingContent, PlatformStatus } from "@/lib/merchantLandingDefaults";
import PlatformIcon, { platformIconTone } from "@/components/PlatformIcon";

const STATUS_LABEL: Record<PlatformStatus, string> = {
  AVAILABLE: "Beschikbaar",
  BETA: "Beta",
  COMING_SOON: "Binnenkort",
  MANUAL_SETUP: "Handmatige setup",
};

function BenefitIcon({ icon }: { icon: string }) {
  const common = "h-6 w-6 text-brand";
  if (icon === "tag") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M20 10V4h-6l-9 9 6 6 9-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="15.5" cy="7.5" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (icon === "cog") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19c.8-3 2.8-4.5 5.5-4.5s4.7 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13.5 14.8c1.1-.5 2.4-.7 3.7-.5 2 .3 3.5 1.5 4.3 3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function StepIcon({ icon }: { icon?: string }) {
  if (icon === "link") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M9 12a4 4 0 0 1 4-4h3a4 4 0 0 1 0 8h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M15 12a4 4 0 0 1-4 4H8a4 4 0 0 1 0-8h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (icon === "megaphone") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 10v4l10 3V7L4 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 9.5c2 .8 4 1 6 .5M14 14.5c2-.8 4-1 6-.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 14v3.5a2 2 0 0 0 2.5 1.9L11 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3v4h4M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FaqAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.question} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span className="text-base font-extrabold text-navy">{item.question}</span>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-brand transition ${isOpen ? "rotate-45" : ""}`}>
                +
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-blue-50 px-5 pb-5 pt-3 text-sm leading-relaxed text-muted">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MarketplacePreview() {
  const cards = [
    {
      title: "Urban Kicks",
      badge: "Cashback",
      badgeClass: "bg-violet-100 text-violet-700",
      img: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    },
    {
      title: "Woonatelier",
      badge: "10% kortingscode",
      badgeClass: "bg-sky-100 text-sky-800",
      img: "https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    },
    {
      title: "Green Nest",
      badge: "Cashback & korting",
      badgeClass: "bg-emerald-100 text-emerald-800",
      img: "https://images.pexels.com/photos/1005058/pexels-photo-1005058.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    },
  ];
  const cats = ["Mode", "Wonen", "Elektronika", "Sport", "Beauty"];

  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand/15 via-sky-100/60 to-transparent blur-xl" aria-hidden />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/95 p-4 shadow-[0_28px_60px_-28px_rgba(10,27,63,0.45)] sm:p-5">
        <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-mist px-4 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-muted" aria-hidden>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-semibold text-muted">Zoek een webshop of aanbieding…</span>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {cats.map((c) => (
            <span key={c} className="shrink-0 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand">
              {c}
            </span>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <article key={card.title} className="overflow-hidden rounded-2xl border border-blue-50 bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.img} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <div className="space-y-2 p-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${card.badgeClass}`}>
                  {card.badge}
                </span>
                <p className="text-sm font-extrabold text-navy">{card.title}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] font-semibold text-muted">
          Illustratief voorbeeld — geen live aanbiedingen
        </p>
      </div>
    </div>
  );
}

function BenefitsVisual() {
  return (
    <div className="relative mx-auto max-w-lg">
      <div className="overflow-hidden rounded-[2rem] shadow-[0_28px_60px_-24px_rgba(10,27,63,0.4)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=900&h=1100&fit=crop"
          alt=""
          className="aspect-[4/5] w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="absolute bottom-6 right-0 w-[46%] overflow-hidden rounded-[1.4rem] border-4 border-white bg-navy shadow-2xl sm:right-[-4%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=400&h=700&fit=crop"
          alt=""
          className="aspect-[9/16] w-full object-cover opacity-90"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy via-navy/80 to-transparent p-3">
          <p className="text-[10px] font-bold text-white/70">ShopBonus</p>
          <p className="text-xs font-extrabold text-white">Webshop preview</p>
        </div>
      </div>
      <div className="merchant-float absolute left-2 top-10 rounded-2xl bg-white px-3 py-2 shadow-xl">
        <p className="flex items-center gap-2 text-xs font-extrabold text-violet-700">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-violet-600 text-[10px] text-white">%</span>
          Cashbackactie
        </p>
      </div>
      <div className="merchant-float-delay absolute right-4 top-28 rounded-2xl bg-white px-3 py-2 shadow-xl sm:right-8">
        <p className="flex items-center gap-2 text-xs font-extrabold text-brand">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand text-[10px] text-white">#</span>
          Kortingscode
        </p>
      </div>
    </div>
  );
}

function LandingBody() {
  const { content } = useInlineCms();
  const vis = content.section_visibility;
  const order = content.section_order.length ? content.section_order : ["hero", "platforms", "benefits", "offer_preview", "onboarding", "bottom_cta", "faq"];

  const sections: Record<string, ReactNode> = {
    hero: vis.hero !== false && (
      <section key="hero" className="relative isolate overflow-hidden bg-[#f4f8ff]" data-testid="merchant-hero">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="page-blob left-[-10%] top-[-20%] h-[420px] w-[420px] bg-brand/15" />
          <div className="page-blob bottom-[-10%] right-[-5%] h-[360px] w-[360px] bg-sky-300/25" />
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="space-y-5">
            <EditableText
              path="hero.eyebrow"
              as="p"
              className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand"
            />
            <EditableText
              path="hero.heading"
              as="h1"
              multiline
              className="whitespace-pre-line text-[clamp(2.25rem,5vw,3.6rem)] font-black leading-[1.05] tracking-tight text-navy"
            />
            <EditableText
              path="hero.subtitle"
              as="p"
              multiline
              className="max-w-xl text-lg leading-relaxed text-muted"
            />
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={content.hero.primary_cta.href}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand px-7 py-3.5 text-[15px] font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.65)] transition hover:bg-brand-dark"
                data-testid="hero-primary-cta"
              >
                {content.hero.primary_cta.label}
                <span aria-hidden>→</span>
              </Link>
              <a
                href={content.hero.secondary_cta.href}
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-blue-200 bg-white/80 px-7 py-3.5 text-[15px] font-extrabold text-navy transition hover:border-brand/40"
                data-testid="hero-secondary-cta"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand/10 text-brand" aria-hidden>
                  ▶
                </span>
                {content.hero.secondary_cta.label}
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              {content.hero.trust.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-green-100 text-green-600">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <HeroIllustration note={content.hero.artwork_note} />
        </div>
      </section>
    ),

    platforms: vis.platforms !== false && (
      <section key="platforms" id="integraties" className="bg-[#e8f2ff] py-16 sm:py-20" data-testid="merchant-platforms">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <EditableText path="platforms.heading" as="h2" className="text-3xl font-black tracking-tight text-navy sm:text-4xl" />
          <EditableText path="platforms.subtitle" as="p" className="mx-auto mt-3 max-w-2xl text-base text-muted" />
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {content.platforms.tiles.map((tile) => {
              const connectable = tile.connectable !== false && tile.status !== "COMING_SOON";
              const inner = (
                <>
                  <span className={`grid h-14 w-14 place-items-center rounded-2xl p-3 ${platformIconTone(tile.platform)}`}>
                    <PlatformIcon platform={tile.platform} className="h-8 w-8" title={tile.name} />
                  </span>
                  <span className="mt-3 text-sm font-extrabold text-navy">{tile.name}</span>
                  <span
                    className={`mt-2 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      tile.status === "AVAILABLE"
                        ? "bg-mint text-mint-dark"
                        : tile.status === "COMING_SOON"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {STATUS_LABEL[tile.status]}
                  </span>
                </>
              );
              return connectable ? (
                <Link
                  key={tile.platform}
                  href={tile.href}
                  className="lift flex flex-col items-center rounded-2xl bg-white px-4 py-6 shadow-[0_12px_30px_-18px_rgba(10,27,63,0.35)]"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={tile.platform}
                  className="flex flex-col items-center rounded-2xl bg-white/80 px-4 py-6 opacity-90 shadow-sm"
                  title={tile.blocked_reason || "Nog niet beschikbaar"}
                >
                  {inner}
                </div>
              );
            })}
          </div>
          {content.platforms.cta_label && content.platforms.cta_href && (
            <Link
              href={content.platforms.cta_href}
              className="mt-8 inline-flex text-sm font-extrabold text-brand hover:underline"
            >
              {content.platforms.cta_label} →
            </Link>
          )}
        </div>
      </section>
    ),

    benefits: vis.benefits !== false && (
      <section key="benefits" id="voordelen" className="bg-[#f4f8ff] py-16 sm:py-24" data-testid="merchant-benefits">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <BenefitsVisual />
          <div className="space-y-6">
            <EditableText path="benefits.eyebrow" as="p" className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand" />
            <EditableText
              path="benefits.heading"
              as="h2"
              multiline
              className="whitespace-pre-line text-[clamp(2rem,4vw,3rem)] font-black leading-[1.1] tracking-tight text-navy"
            />
            <EditableText path="benefits.description" as="p" multiline className="text-base leading-relaxed text-muted" />
            <ul className="space-y-5 pt-2">
              {content.benefits.items.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/10">
                    <BenefitIcon icon={item.icon} />
                  </span>
                  <div>
                    <p className="text-lg font-extrabold text-navy">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    ),

    offer_preview: vis.offer_preview !== false && (
      <section key="offer_preview" className="bg-[#eaf3ff] py-16 sm:py-24" data-testid="merchant-offer-preview">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8">
          <div className="space-y-5">
            <EditableText path="offer_preview.eyebrow" as="p" className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand" />
            <EditableText
              path="offer_preview.heading"
              as="h2"
              multiline
              className="whitespace-pre-line text-[clamp(2rem,4vw,3rem)] font-black leading-[1.1] tracking-tight text-navy"
            />
            <EditableText path="offer_preview.description" as="p" multiline className="text-base leading-relaxed text-muted" />
            <Link
              href={content.offer_preview.cta_href}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_14px_30px_-12px_rgba(11,116,255,0.6)]"
              data-testid="offer-preview-cta"
            >
              {content.offer_preview.cta_label}
              <span aria-hidden>→</span>
            </Link>
          </div>
          <MarketplacePreview />
        </div>
      </section>
    ),

    onboarding: vis.onboarding !== false && (
      <section key="onboarding" id="zo-werkt-het" className="bg-white py-16 sm:py-24" data-testid="merchant-onboarding">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <EditableText path="onboarding.eyebrow" as="p" className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand" />
          <EditableText path="onboarding.heading" as="h2" className="mt-3 text-3xl font-black tracking-tight text-navy sm:text-4xl" />
          <ol className="relative mt-14 grid gap-10 lg:grid-cols-3 lg:gap-8">
            <div
              className="pointer-events-none absolute left-[16%] right-[16%] top-10 hidden h-0.5 bg-gradient-to-r from-transparent via-brand/40 to-transparent lg:block"
              aria-hidden
            />
            {content.onboarding.steps.map((step) => (
              <li key={step.number} className="relative flex flex-col items-center text-center">
                <span className="text-5xl font-black text-brand/20 sm:text-6xl">{step.number}</span>
                <span className="relative z-10 -mt-4 grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-[0_12px_28px_-10px_rgba(11,116,255,0.7)]">
                  <StepIcon icon={step.icon} />
                </span>
                <h3 className="mt-5 text-xl font-extrabold text-navy">{step.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    ),

    bottom_cta: vis.bottom_cta !== false && (
      <section key="bottom_cta" className="bg-[#f4f8ff] px-4 pb-8 pt-4 sm:px-6 lg:px-8" data-testid="merchant-bottom-cta">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#0b74ff] px-6 py-12 text-white shadow-[0_28px_60px_-24px_rgba(11,116,255,0.55)] sm:px-10 lg:px-14">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-sky-300/30 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl space-y-3">
              <EditableText path="bottom_cta.eyebrow" as="p" className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/80" />
              <EditableText path="bottom_cta.heading" as="h2" className="text-3xl font-black tracking-tight sm:text-4xl" />
              <EditableText path="bottom_cta.description" as="p" className="text-base text-white/85" />
            </div>
            <Link
              href={content.bottom_cta.cta_href}
              className="inline-flex shrink-0 items-center rounded-full bg-white px-7 py-3.5 text-sm font-extrabold text-brand shadow-lg transition hover:bg-blue-50"
              data-testid="bottom-cta-button"
            >
              {content.bottom_cta.cta_label}
            </Link>
          </div>
        </div>
      </section>
    ),

    faq: vis.faq !== false && (
      <section key="faq" id="faq" className="bg-[#f4f8ff] py-16 sm:pb-24" data-testid="merchant-faq">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <EditableText path="faq.heading" as="h2" className="mb-8 text-center text-3xl font-black tracking-tight text-navy" />
          <FaqAccordion items={content.faq.items} />
          <p className="mt-10 text-center text-sm text-muted">{content.footer.blurb}</p>
        </div>
      </section>
    ),
  };

  return (
    <div className="bg-[#f4f8ff]">
      {order.map((key) => sections[key])}
      <CmsToolbar />
    </div>
  );
}

export default function MerchantLandingView({
  initialContent,
}: {
  initialContent: MerchantLandingContent;
}) {
  return (
    <InlineCmsProvider initialContent={initialContent}>
      <LandingBody />
    </InlineCmsProvider>
  );
}
