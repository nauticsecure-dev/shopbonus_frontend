import type { HomepageContent } from "@/lib/homepageDefaults";

const ICONS = [
  <svg key="1" width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-brand" aria-hidden>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" />
    <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>,
  <svg key="2" width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-brand" aria-hidden>
    <path d="M6 8h12l1 12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 8Z" stroke="currentColor" strokeWidth="2" />
    <path d="M9 10V6.5a3 3 0 0 1 6 0V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>,
  <svg key="3" width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-brand" aria-hidden>
    <rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
    <path
      d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13M12 8s-4 0-5.5-1.5A1.5 1.5 0 0 1 8 4c1 0 3 2 4 4Zm0 0s4 0 5.5-1.5A1.5 1.5 0 0 0 16 4c-1 0-3 2-4 4Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>,
];

export default function HowItWorks({ content }: { content: HomepageContent["how_it_works"] }) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8" id="hoe-werkt-het-home" data-testid="how-it-works">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-black tracking-tight text-navy sm:text-3xl">{content.heading}</h2>
        <p className="text-sm font-semibold text-muted">{content.subtitle}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {content.steps.map((s, i) => (
          <div key={s.title} className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-light">
                {ICONS[i] ?? ICONS[0]}
              </span>
              <div>
                <p className="font-black text-navy">
                  <span className="mr-1.5 text-brand">{i + 1}</span>
                  {s.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
