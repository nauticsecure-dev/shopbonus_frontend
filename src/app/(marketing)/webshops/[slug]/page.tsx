import Link from "next/link";
import { notFound } from "next/navigation";
import { OfferTicket, WebshopCard } from "@/components/Cards";
import { webshops } from "@/fixtures/dummy";

export function generateStaticParams() {
  return webshops.map((w) => ({ slug: w.slug }));
}

export default async function WebshopDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = webshops.find((w) => w.slug === slug);
  if (!shop) notFound();

  const others = webshops.filter((w) => w.slug !== shop.slug).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-4 pt-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Link href="/webshops" className="hover:text-brand">Webshops</Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <Link href={`/webshops?cat=${encodeURIComponent(shop.category)}`} className="hover:text-brand">
          {shop.category}
        </Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="text-brand">{shop.name}</span>
      </nav>

      {/* Banner */}
      <div className="mt-4 overflow-hidden rounded-[1.75rem] shadow-[0_20px_50px_-20px_rgba(10,27,63,0.4)]">
        <img src={shop.banner} alt={shop.name} className="h-56 w-full object-cover sm:h-72" />
      </div>

      {/* Shop header */}
      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-5">
          <span
            className="grid h-24 w-24 shrink-0 place-items-center rounded-full text-2xl font-black shadow-md"
            style={{ background: shop.logoBg, color: shop.logoColor }}
          >
            {shop.logoText}
          </span>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-navy sm:text-5xl">
              {shop.name}
            </h1>
            <p className="mt-2 max-w-xl leading-relaxed text-muted">{shop.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {shop.tags.map((t) => (
                <span key={t} className="rounded-full bg-brand-light px-4 py-1.5 text-[13px] font-bold text-navy">
                  {t}
                </span>
              ))}
              <span className="ml-1 flex items-center gap-1.5 text-sm font-bold text-navy">
                <svg width="15" height="15" viewBox="0 0 24 24" className="fill-amber-400">
                  <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
                </svg>
                {shop.rating} <span className="font-semibold text-muted">({shop.reviews.toLocaleString("nl-NL")} reviews)</span>
              </span>
              <span className="rounded-full bg-mint px-4 py-1.5 text-[13px] font-extrabold text-mint-dark">
                {shop.cashback}
              </span>
            </div>
          </div>
        </div>
        <a
          href={shop.url}
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-brand px-9 py-4 text-[16px] font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.7)] transition hover:bg-brand-dark"
        >
          Bezoek webshop
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </div>

      {/* Offers */}
      <div className="mt-10">
        <h2 className="text-3xl font-black tracking-tight text-navy">
          {shop.offers.length} beschikbare aanbiedingen
        </h2>
        <p className="mt-1.5 text-muted">
          Ontgrendel met je ShopBonus-tegoed en bespaar direct bij {shop.name}.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {shop.offers.map((o) => (
            <OfferTicket key={o.id} shop={shop} offer={o} />
          ))}
        </div>
      </div>

      {/* About */}
      <div className="mt-10 grid gap-6 rounded-[1.75rem] bg-white p-8 shadow-sm lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="text-xl font-black text-navy">Over {shop.name}</h3>
          <p className="mt-2 leading-relaxed text-muted">{shop.longDescription}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-xl bg-mist px-4 py-2 text-sm font-bold text-navy">✓ Gratis verzending vanaf €50</span>
            <span className="rounded-xl bg-mist px-4 py-2 text-sm font-bold text-navy">✓ 30 dagen bedenktijd</span>
            <span className="rounded-xl bg-mist px-4 py-2 text-sm font-bold text-navy">✓ Achteraf betalen</span>
          </div>
        </div>
        <div className="rounded-2xl bg-mist p-6">
          <h4 className="font-extrabold text-navy">Zo spaar je tegoed</h4>
          <ol className="mt-3 space-y-2.5 text-sm font-medium text-muted">
            <li className="flex gap-2.5"><span className="font-black text-brand">1.</span> Klik op “Bezoek webshop” hierboven.</li>
            <li className="flex gap-2.5"><span className="font-black text-brand">2.</span> Shop zoals je gewend bent en rond je aankoop af.</li>
            <li className="flex gap-2.5"><span className="font-black text-brand">3.</span> Wij zetten {shop.cashback.toLowerCase()} als tegoed in je wallet.</li>
          </ol>
        </div>
      </div>

      {/* Others */}
      <div className="mt-12">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-navy">Bekijk ook</h3>
          <Link href="/webshops" className="font-bold text-brand hover:underline">
            Alle webshops →
          </Link>
        </div>
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((w) => (
            <WebshopCard key={w.slug} shop={w} />
          ))}
        </div>
      </div>
    </div>
  );
}
