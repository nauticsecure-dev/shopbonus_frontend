import type { Metadata } from "next";
import AboutUsView from "@/components/over-ons/AboutUsView";
import { fetchAboutUsServer } from "@/lib/aboutUs";

export async function generateMetadata(): Promise<Metadata> {
  const content = await fetchAboutUsServer("nl");
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
  const content = await fetchAboutUsServer("nl");
  return <AboutUsView initialContent={content} />;
}
