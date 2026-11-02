import type { Metadata } from "next";
import { requestLocale } from "@/i18n/requestLocale";
import MerchantLandingView from "@/components/voor-webshops/MerchantLandingView";
import { fetchMerchantLandingServer } from "@/lib/merchantLanding";

export async function generateMetadata(): Promise<Metadata> {
  const content = await fetchMerchantLandingServer(await requestLocale());
  return {
    title: content.seo_title || content.title,
    description: content.seo_description,
    alternates: { canonical: "/voor-webshops" },
    openGraph: {
      title: content.seo_title || content.title,
      description: content.seo_description,
      type: "website",
      url: "/voor-webshops",
      images: content.seo_image_url ? [{ url: content.seo_image_url }] : undefined,
    },
  };
}

export default async function VoorWebshopsLandingPage() {
  const content = await fetchMerchantLandingServer(await requestLocale());
  return <MerchantLandingView initialContent={content} />;
}
