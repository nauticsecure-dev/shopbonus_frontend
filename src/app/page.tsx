import type { Metadata } from "next";
import HomepageView from "@/components/homepage/HomepageView";
import { fetchPublicWebshopsServer } from "@/lib/discoveryServer";
import {
  fetchDiscountCodesServer,
  fetchHomepageContentServer,
} from "@/lib/homepage";

export async function generateMetadata(): Promise<Metadata> {
  const content = await fetchHomepageContentServer("nl");
  const ogImage = (content as { seo_image_url?: string | null }).seo_image_url;
  return {
    title: content.seo_title || content.title,
    description: content.seo_description,
    alternates: { canonical: "/" },
    openGraph: {
      title: content.seo_title || content.title,
      description: content.seo_description,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default async function HomePage() {
  const content = await fetchHomepageContentServer("nl");
  const limit = content.popular_webshops.limit || 4;
  const featured =
    content.popular_webshops.mode === "featured" &&
    (content.popular_webshops.featured_slugs?.length ?? 0) > 0;

  const [{ data: featuredShops, meta: shopsMeta }, discountCodes] = await Promise.all([
    featured
      ? fetchPublicWebshopsServer({
          slugs: content.popular_webshops.featured_slugs.slice(0, limit),
          per_page: limit,
        })
      : fetchPublicWebshopsServer({ sort: "most_offers", per_page: limit }),
    fetchDiscountCodesServer(content.discount_codes.limit || 2),
  ]);

  // Soft fallback: if featured slugs yield nothing, show auto popular shops.
  const shops =
    featured && featuredShops.length === 0
      ? (await fetchPublicWebshopsServer({ sort: "most_offers", per_page: limit })).data
      : featuredShops;

  return (
    <HomepageView
      initialContent={content}
      featuredShops={shops}
      discountCodes={discountCodes}
      shopCount={shopsMeta?.total ?? shops.length}
    />
  );
}
