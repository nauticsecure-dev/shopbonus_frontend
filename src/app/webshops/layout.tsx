import type { Metadata } from "next";
import ConsumerAccess from "@/components/ConsumerAccess";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DiscoveryLayout({ children }: { children: React.ReactNode }) {
  return <ConsumerAccess>{children}</ConsumerAccess>;
}
