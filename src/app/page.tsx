import { requestLocale } from "@/i18n/requestLocale";

import type { Metadata } from "next";
import HomepageView from "@/components/homepage/HomepageView";
import { fetchHomepageContentServer } from "@/lib/homepage";



export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const content = await fetchHomepageContentServer(locale);
  const ogImage = (content as { seo_image_url?: string | null }).seo_image_url;
  return {
    title: content.seo_title || content.title,
    description: content.seo_description,
    alternates: { canonical: "/" },
    twitter: {
      card: "summary_large_image",
      title: content.seo_title || content.title,
      description: content.seo_description,
      images: [ogImage || "/brand/og.png"],
    },
    openGraph: {
      title: content.seo_title || content.title,
      description: content.seo_description,
      type: "website",
      locale: locale === "en" ? "en_GB" : "nl_NL",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default async function HomePage() {
  const locale = await requestLocale();
  const content = await fetchHomepageContentServer(locale);
  // Discovery reads are started client-side only after a session is established.
  return <HomepageView initialContent={content} featuredShops={[]} discountCodes={[]} shopCount={0} />;
}
