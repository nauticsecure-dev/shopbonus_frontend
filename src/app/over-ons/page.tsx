import type { Metadata } from "next";
import { cookies } from "next/headers";
import AboutUsView from "@/components/over-ons/AboutUsView";
import { fetchAboutUsServer } from "@/lib/aboutUs";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await cookies()).get("shopbonus-locale")?.value === "en" ? "en" : "nl";
  const content = await fetchAboutUsServer(locale);
  if (!content) {
    const title = locale === "en" ? "About us unavailable" : "Over ons niet beschikbaar";
    return { title, description: "", robots: { index: false }, openGraph: { title, description: "", images: [] }, twitter: { title, description: "", images: [] } };
  }
  return {
    title: content.seo_title || content.title,
    description: content.seo_description,
    alternates: { canonical: "/over-ons" },
    openGraph: {
      title: content.seo_title || content.title,
      description: content.seo_description,
      type: "website",
      url: "/over-ons",
      images: content.seo_image_url ? [{ url: content.seo_image_url }] : undefined,
    },
  };
}

export default async function OverOnsPage() {
  const locale = (await cookies()).get("shopbonus-locale")?.value === "en" ? "en" : "nl";
  const content = await fetchAboutUsServer(locale);
  return <AboutUsView initialContent={content} initialLocale={locale} />;
}
