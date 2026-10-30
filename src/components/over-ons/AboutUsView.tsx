"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { images } from "@/data/dummy";
import type { AboutUsContent, ValueIcon } from "@/lib/aboutUsDefaults";
import {
  CmsToolbar,
  EditableText,
  InlineCmsProvider,
  useInlineCms,
} from "./AboutUsInlineCms";

function ValueIconSvg({ icon }: { icon: ValueIcon }) {
  const common = "h-6 w-6";
  if (icon === "shop") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 10V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2M4 10h16M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9M9 20v-5h6v5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (icon === "users") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.87M15.5 4.13a3.5 3.5 0 0 1 0 6.74"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21.4 11.6 12.4 2.6A2 2 0 0 0 11 2H4a1 1 0 0 0-1 1v7c0 .5.2 1 .6 1.4l9 9a2 2 0 0 0 2.8 0l6-6a2 2 0 0 0 0-2.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function hasCompanyDetails(contact: AboutUsContent["contact"]) {
  return Boolean(contact.legal_name || contact.address || contact.kvk || contact.email);
}

function AboutUsSections() {
  const { content } = useInlineCms();
  const order = content.section_order?.length
    ? content.section_order
    : ["hero", "story", "revenue_model", "values", "team", "contact", "bottom_cta"];
  const visible = content.section_visibility ?? {};

  const heroImage = content.hero.image_url || images.coffeeLaptop;
  const storyImage = content.story.image_url || images.officeImg;
  const teamImage = content.team.image_url || images.officeImg2;
  const consumerPct = content.revenue_model.consumer_percent ?? 70;
  const platformPct = content.revenue_model.platform_percent ?? 30;

  const sections: Record<string, ReactNode> = {
    hero: (
      <section
        key="hero"
        data-testid="about-hero"
        className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100/60"
      >
        <div className="pointer-events-none absolute -right-24 top-0 h-[420px] w-[420px] rounded-full bg-sky-200/40 blur-3xl" aria-hidden />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <EditableText
              path="hero.eyebrow"
              as="p"
              className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand"
            />
            <EditableText
              path="hero.heading"
              accentPath="hero.heading_accent"
              as="h1"
              className="mt-3 text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[1.05] tracking-tight text-navy"
            />
            <EditableText
              path="hero.subtitle"
              as="p"
              multiline
              className="mt-5 max-w-md leading-relaxed text-muted"
            />
            <a
              href={content.hero.cta_href || "#verhaal"}
              className="mt-6 inline-flex items-center gap-2 border-b-2 border-brand pb-1 font-bold text-brand"
              data-testid="about-hero-cta"
            >
              <EditableText path="hero.cta_label" as="span" />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 5v14m-6-6 6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt=""
                className="h-96 w-full object-cover"
                loading="eager"
              />
            </div>
            <div className="absolute right-5 top-5 max-w-[230px] rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur">
              <div className="flex items-start gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-light text-brand">
                  <ValueIconSvg icon="tag" />
                </span>
                <div>
                  <EditableText path="hero.float_title" as="p" className="text-sm font-extrabold text-navy" />
                  <EditableText path="hero.float_text" as="p" className="text-xs leading-snug text-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    ),
    story: (
      <section
        key="story"
        id="verhaal"
        data-testid="about-story"
        className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8"
      >
        <div className="overflow-hidden rounded-[2rem] shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={storyImage} alt="" className="h-[28rem] w-full object-cover" loading="lazy" />
        </div>
        <div>
          <EditableText
            path="story.eyebrow"
            as="p"
            className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand"
          />
          <EditableText
            path="story.heading"
            accentPath="story.heading_accent"
            as="h2"
            className="mt-3 text-4xl font-black leading-tight tracking-tight text-navy sm:text-5xl"
          />
          <div className="mt-5 space-y-4 leading-relaxed text-muted">
            {(content.story.paragraphs ?? []).map((_, i) => (
              <EditableText key={i} path={`story.paragraphs.${i}`} as="p" multiline />
            ))}
          </div>
        </div>
      </section>
    ),
    revenue_model: (
      <section key="revenue_model" data-testid="about-revenue" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b63ee] to-[#0b3fa0] p-8 text-white sm:p-12">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <EditableText
                path="revenue_model.eyebrow"
                as="p"
                className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-200"
              />
              <EditableText
                path="revenue_model.heading"
                as="h2"
                multiline
                className="mt-4 text-4xl font-black leading-tight sm:text-5xl"
              />
            </div>
            <div>
              <EditableText
                path="revenue_model.explanation"
                as="p"
                multiline
                className="text-blue-100/90"
              />
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 rounded-2xl bg-white p-5 text-navy" data-testid="about-split-consumer">
                  <p className="text-4xl font-black text-brand">{consumerPct}%</p>
                  <EditableText path="revenue_model.consumer_label" as="p" className="mt-1 font-extrabold" />
                  <EditableText
                    path="revenue_model.consumer_description"
                    as="p"
                    multiline
                    className="mt-1 text-xs leading-snug text-muted"
                  />
                </div>
                <div className="flex-1 rounded-2xl border border-white/30 bg-navy/40 p-5" data-testid="about-split-platform">
                  <p className="text-4xl font-black">{platformPct}%</p>
                  <EditableText path="revenue_model.platform_label" as="p" className="mt-1 font-extrabold" />
                  <EditableText
                    path="revenue_model.platform_description"
                    as="p"
                    multiline
                    className="mt-1 text-xs leading-snug text-blue-100/80"
                  />
                </div>
              </div>
              <p className="mt-3 flex items-start gap-2 text-xs text-blue-100/70">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8h.01M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <EditableText path="revenue_model.footnote" as="span" multiline />
              </p>
            </div>
          </div>
        </div>
      </section>
    ),
    values: (
      <section key="values" data-testid="about-values" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <EditableText
            path="values.eyebrow"
            as="p"
            className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand"
          />
          <EditableText
            path="values.heading"
            as="h2"
            className="mt-3 text-4xl font-black leading-tight text-navy sm:text-5xl"
          />
          <EditableText
            path="values.introduction"
            as="p"
            multiline
            className="mt-4 leading-relaxed text-muted"
          />
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {(content.values.items ?? []).map((item, i) => (
            <div key={item.title + i} className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-blue-50">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-light text-brand">
                <ValueIconSvg icon={item.icon} />
              </span>
              <EditableText
                path={`values.items.${i}.title`}
                as="h3"
                className="mt-4 text-lg font-black text-navy"
              />
              <EditableText
                path={`values.items.${i}.description`}
                as="p"
                multiline
                className="mt-2 text-sm leading-relaxed text-muted"
              />
            </div>
          ))}
        </div>
      </section>
    ),
    team: (
      <section
        key="team"
        data-testid="about-team"
        className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:px-8"
      >
        <div className="relative overflow-hidden rounded-[2rem] shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={teamImage} alt="" className="h-80 w-full object-cover" loading="lazy" />
          {!content.team.show_profiles || !content.team.profiles?.length ? (
            <div className="absolute inset-0 grid place-items-center bg-navy/20 p-8">
              <div className="grid h-48 w-64 place-items-center rounded-2xl bg-white/90 text-center backdrop-blur">
                <div>
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mx-auto text-muted"
                    aria-hidden
                  >
                    <path
                      d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.87M15.5 4.13a3.5 3.5 0 0 1 0 6.74"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <EditableText
                    path="team.placeholder_label"
                    as="p"
                    className="mt-2 text-sm font-semibold text-muted whitespace-pre-line"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div>
          <EditableText
            path="team.eyebrow"
            as="p"
            className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand"
          />
          <EditableText
            path="team.heading"
            as="h2"
            className="mt-3 text-4xl font-black tracking-tight text-navy"
          />
          <EditableText path="team.body" as="p" multiline className="mt-4 leading-relaxed text-muted" />
          {content.team.show_profiles && content.team.profiles?.length > 0 ? (
            <ul className="mt-5 space-y-4" data-testid="about-team-profiles">
              {content.team.profiles.map((profile, i) => (
                <li key={profile.name + i} className="rounded-2xl border border-blue-100 bg-white p-4">
                  <p className="font-extrabold text-navy">{profile.name}</p>
                  {profile.role ? <p className="text-sm text-brand">{profile.role}</p> : null}
                  {profile.bio ? <p className="mt-1 text-sm text-muted">{profile.bio}</p> : null}
                  {profile.linkedin_href ? (
                    <a
                      href={profile.linkedin_href}
                      className="mt-2 inline-block text-sm font-bold text-brand"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      LinkedIn
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-5 flex gap-3 rounded-2xl bg-blue-50 p-5">
            <span className="text-4xl font-black leading-none text-brand" aria-hidden>
              “
            </span>
            <EditableText path="team.quote" as="p" multiline className="font-semibold italic text-navy" />
          </div>
        </div>
      </section>
    ),
    contact: (
      <section
        key="contact"
        id="contact"
        data-testid="about-contact"
        className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"
      >
        <div className="rounded-[2rem] bg-mist/80 p-8 sm:p-10">
          <EditableText path="contact.heading" as="h2" className="text-3xl font-black text-navy" />
          <EditableText path="contact.intro" as="p" multiline className="mt-3 max-w-2xl text-muted" />
          <ul className="mt-6 flex flex-wrap gap-3">
            {(content.contact.links ?? []).map((link, i) => (
              <li key={link.href + i}>
                <Link
                  href={link.href}
                  className="inline-flex rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-bold text-brand hover:border-brand"
                  data-testid={`about-contact-link-${i}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {hasCompanyDetails(content.contact) ? (
            <dl className="mt-8 grid gap-3 text-sm text-navy sm:grid-cols-2" data-testid="about-company-details">
              {content.contact.legal_name ? (
                <>
                  <dt className="font-bold text-muted">Bedrijfsnaam</dt>
                  <dd>{content.contact.legal_name}</dd>
                </>
              ) : null}
              {content.contact.address ? (
                <>
                  <dt className="font-bold text-muted">Adres</dt>
                  <dd className="whitespace-pre-line">{content.contact.address}</dd>
                </>
              ) : null}
              {content.contact.kvk ? (
                <>
                  <dt className="font-bold text-muted">KvK</dt>
                  <dd>{content.contact.kvk}</dd>
                </>
              ) : null}
              {content.contact.email ? (
                <>
                  <dt className="font-bold text-muted">E-mail</dt>
                  <dd>
                    <a className="font-bold text-brand" href={`mailto:${content.contact.email}`}>
                      {content.contact.email}
                    </a>
                  </dd>
                </>
              ) : null}
            </dl>
          ) : null}
        </div>
      </section>
    ),
    bottom_cta: (
      <section key="bottom_cta" data-testid="about-bottom-cta" className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-6 rounded-[2rem] bg-gradient-to-br from-[#0b63ee] to-[#0b3fa0] p-8 text-white sm:p-12 lg:grid-cols-2">
          <div>
            <EditableText
              path="bottom_cta.eyebrow"
              as="p"
              className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-200"
            />
            <EditableText
              path="bottom_cta.heading"
              accentPath="bottom_cta.heading_accent"
              as="h2"
              className="mt-3 text-4xl font-black leading-tight sm:text-5xl [&_.text-brand]:text-sky-300"
            />
          </div>
          <div>
            <EditableText
              path="bottom_cta.description"
              as="p"
              multiline
              className="text-blue-100/90"
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={content.bottom_cta.consumer_cta.href}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 font-extrabold text-brand"
                data-testid="about-cta-consumer"
              >
                {content.bottom_cta.consumer_cta.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
                href={content.bottom_cta.merchant_cta.href}
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/40 px-7 py-3.5 font-extrabold text-white hover:bg-white/10"
                data-testid="about-cta-merchant"
              >
                {content.bottom_cta.merchant_cta.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 12h14m-6-6 6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <div>
      {order.map((key) => {
        if (visible[key] === false) return null;
        return sections[key] ?? null;
      })}
      <CmsToolbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: content.contact.legal_name || "ShopBonus",
            url: "https://shopbonus.nl/over-ons",
            ...(content.contact.email ? { email: content.contact.email } : {}),
            ...(content.contact.address
              ? { address: { "@type": "PostalAddress", streetAddress: content.contact.address } }
              : {}),
          }),
        }}
      />
    </div>
  );
}

export default function AboutUsView({ initialContent }: { initialContent: AboutUsContent }) {
  return (
    <InlineCmsProvider initialContent={initialContent}>
      <AboutUsSections />
    </InlineCmsProvider>
  );
}
