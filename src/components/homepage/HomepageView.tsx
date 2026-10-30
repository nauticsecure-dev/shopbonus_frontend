"use client";

import Link from "next/link";
import { useEffect } from "react";
import HeroSection from "./HeroSection";
import HomeSearchBar from "./HomeSearchBar";
import HowItWorks from "./HowItWorks";
import DiscountCodesPanel from "./DiscountCodesPanel";
import WalletPreviewCard from "./WalletPreviewCard";
import PopularWebshops from "@/components/PopularWebshops";
import {
  CmsToolbar,
  EditableText,
  InlineCmsProvider,
  useInlineCms,
} from "./InlineCms";
import type { HomepageContent } from "@/lib/homepageDefaults";
import type { PublicDiscountCode } from "@/lib/homepage";
import type { DiscoveryWebshopCard } from "@/lib/discovery";

type Props = {
  initialContent: HomepageContent;
  featuredShops: DiscoveryWebshopCard[];
  discountCodes: PublicDiscountCode[];
  shopCount: number;
};

function EditableHero() {
  const { content, mode, canEdit, updateField } = useInlineCms();
  if (!(canEdit && mode === "edit")) {
    return <HeroSection content={content.hero} />;
  }

  return (
    <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-6 pt-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-16">
      <div className="relative z-10 space-y-5">
        <EditableText
          path="hero.heading"
          as="h1"
          multiline
          className="text-[clamp(2.4rem,5.5vw,3.75rem)] font-black leading-[1.05] tracking-tight text-navy"
        />
        <EditableText
          path="hero.subtitle"
          as="p"
          multiline
          className="max-w-md text-lg leading-relaxed text-muted"
        />
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href={content.hero.primary_cta.href}
            className="inline-flex items-center gap-2.5 rounded-2xl bg-brand px-7 py-3.5 text-[15px] font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.65)]"
          >
            <EditableText path="hero.primary_cta.label" className="text-[15px] font-extrabold text-white" />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12h14m-6-6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            href={content.hero.secondary_cta.href}
            className="inline-flex items-center gap-2.5 rounded-2xl border-2 border-blue-200 bg-white/70 px-7 py-3.5 text-[15px] font-extrabold text-navy"
          >
            <EditableText path="hero.secondary_cta.label" className="text-[15px] font-extrabold text-navy" />
          </Link>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {content.hero.trust.map((t, i) => (
            <li key={`${t}-${i}`} className="flex items-center gap-2 text-sm font-semibold text-navy">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-green-100 text-green-600">✓</span>
              <button
                type="button"
                className="rounded-md outline outline-2 outline-dashed outline-brand/40"
                data-cms-edit={`hero.trust.${i}`}
                onClick={() => {
                  const next = window.prompt("Trust indicator", t);
                  if (next != null && next.trim()) {
                    const trust = [...content.hero.trust];
                    trust[i] = next.trim().slice(0, 80);
                    updateField("hero.trust", trust);
                  }
                }}
              >
                {t}
                <span className="ml-1 text-[10px] text-brand">✎</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs font-semibold text-brand">
          Bewerkmodus: klik op tekst met stippellijn om te wijzigen. Financiële bedragen in de illustratie zijn
          voorbeelden.
        </p>
      </div>
      <div className="pointer-events-none opacity-95">
        <HeroSection content={content.hero} artworkOnly />
      </div>
    </div>
  );
}

function EditableHowItWorks() {
  const { content, mode, canEdit, updateField } = useInlineCms();
  if (!(canEdit && mode === "edit")) {
    return <HowItWorks content={content.how_it_works} />;
  }

  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8" id="hoe-werkt-het-home">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <EditableText
          path="how_it_works.heading"
          as="h2"
          className="text-2xl font-black tracking-tight text-navy sm:text-3xl"
        />
        <EditableText path="how_it_works.subtitle" as="p" className="text-sm font-semibold text-muted" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {content.how_it_works.steps.map((s, i) => (
          <div key={s.title + i} className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="font-black text-navy">
              <span className="mr-1.5 text-brand">{i + 1}</span>
              <button
                type="button"
                className="rounded-md outline outline-2 outline-dashed outline-brand/40"
                onClick={() => {
                  const next = window.prompt("Stap titel", s.title);
                  if (next != null && next.trim()) {
                    const steps = content.how_it_works.steps.map((st, idx) =>
                      idx === i ? { ...st, title: next.trim().slice(0, 80) } : st
                    );
                    updateField("how_it_works.steps", steps);
                  }
                }}
              >
                {s.title} ✎
              </button>
            </p>
            <button
              type="button"
              className="mt-1.5 w-full rounded-md text-left text-sm leading-relaxed text-muted outline outline-2 outline-dashed outline-brand/40"
              onClick={() => {
                const next = window.prompt("Stap beschrijving", s.description);
                if (next != null && next.trim()) {
                  const steps = content.how_it_works.steps.map((st, idx) =>
                    idx === i ? { ...st, description: next.trim().slice(0, 400) } : st
                  );
                  updateField("how_it_works.steps", steps);
                }
              }}
            >
              {s.description} ✎
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomepageBody({
  featuredShops,
  discountCodes,
  shopCount,
}: Omit<Props, "initialContent">) {
  const { content } = useInlineCms();
  const vis = content.section_visibility;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#home-search") {
      const el = document.getElementById("home-search-input");
      el?.focus();
    }
  }, []);

  const bgUrl = (content.hero as { background_url?: string | null }).background_url;

  return (
    <div className="relative overflow-hidden bg-[#f4f8ff]" data-testid="homepage">
      {vis.hero !== false && (
        <section className="relative isolate min-h-[560px] sm:min-h-[640px]" data-testid="homepage-hero">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {bgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bgUrl} alt="" className="h-full w-full object-cover opacity-40" />
            ) : null}
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 80% 60% at 85% 20%, rgba(147,197,253,0.45) 0%, transparent 55%),
                  radial-gradient(ellipse 50% 40% at 10% 80%, rgba(191,219,254,0.35) 0%, transparent 50%),
                  linear-gradient(180deg, #eef5ff 0%, #f4f8ff 45%, #f7faff 100%)
                `,
              }}
            />
          </div>
          <div className="page-blob right-[8%] top-8 h-64 w-64 bg-emerald-200/15" />
          <div className="page-blob left-[-5%] top-40 h-72 w-72 bg-blue-200/20" />

          <div className="relative">
            <EditableHero />
          </div>

          {vis.search !== false && (
            <div id="home-search" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <HomeSearchBar placeholder={content.search.placeholder} />
            </div>
          )}
        </section>
      )}

      {vis.popular_webshops !== false && (
        <PopularWebshops
          initialShops={featuredShops}
          limit={content.popular_webshops.limit}
          heading={content.popular_webshops.heading}
          ctaLabel={content.popular_webshops.cta_label}
          ctaHref={content.popular_webshops.cta_href}
        />
      )}

      {vis.how_it_works !== false && <EditableHowItWorks />}

      {vis.benefits !== false && content.benefits && (
        <section className="relative mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8" data-testid="homepage-benefits">
          <h2 className="text-2xl font-black tracking-tight text-navy sm:text-3xl">{content.benefits.heading}</h2>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-7 shadow-sm">
              <h3 className="text-lg font-extrabold text-navy">{content.benefits.consumer_title}</h3>
              <ul className="mt-4 space-y-3">
                {content.benefits.consumer_items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <span className="mt-0.5 text-brand" aria-hidden>
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-white p-7 shadow-sm">
              <h3 className="text-lg font-extrabold text-navy">{content.benefits.merchant_title}</h3>
              <ul className="mt-4 space-y-3">
                {content.benefits.merchant_items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <span className="mt-0.5 text-brand" aria-hidden>
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {vis.discount_codes !== false && (
            <DiscountCodesPanel content={content.discount_codes} initialCodes={discountCodes} />
          )}
          {vis.wallet_preview !== false && <WalletPreviewCard content={content.wallet_preview} />}
        </div>
        {shopCount > 0 && (
          <p className="mt-6 text-center text-xs text-muted">
            {shopCount} webshops aangesloten via ShopBonus
          </p>
        )}
        <p className="mt-2 text-center text-xs text-muted">
          ShopBonus-tegoed is alleen inwisselbaar voor vouchers.{" "}
          <Link href="/hoe-werkt-het" className="font-semibold text-brand hover:underline">
            Meer over sparen
          </Link>
        </p>
      </section>

      {vis.cta_band !== false && content.cta_band && (
        <section className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8" data-testid="homepage-cta">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[1.75rem] bg-navy px-8 py-10 text-white sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-black">{content.cta_band.heading}</h2>
              <p className="mt-2 max-w-xl text-sm text-blue-100/80">{content.cta_band.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={content.cta_band.consumer_cta.href}
                className="rounded-2xl bg-brand px-6 py-3.5 text-sm font-extrabold text-white hover:bg-brand-dark"
              >
                {content.cta_band.consumer_cta.label}
              </Link>
              <Link
                href={content.cta_band.merchant_cta.href}
                className="rounded-2xl border border-white/30 px-6 py-3.5 text-sm font-extrabold text-white hover:bg-white/10"
              >
                {content.cta_band.merchant_cta.label}
              </Link>
            </div>
          </div>
        </section>
      )}

      {vis.faq_teaser !== false && content.faq_teaser && (
        <section className="relative mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8" data-testid="homepage-faq">
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
            <h2 className="text-2xl font-black text-navy">{content.faq_teaser.heading}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{content.faq_teaser.subtitle}</p>
            <Link
              href={content.faq_teaser.cta_href}
              className="mt-5 inline-flex font-extrabold text-brand hover:underline"
            >
              {content.faq_teaser.cta_label}
            </Link>
          </div>
        </section>
      )}

      <CmsToolbar />
    </div>
  );
}

export default function HomepageView(props: Props) {
  return (
    <InlineCmsProvider initialContent={props.initialContent}>
      <HomepageBody
        featuredShops={props.featuredShops}
        discountCodes={props.discountCodes}
        shopCount={props.shopCount}
      />
    </InlineCmsProvider>
  );
}
