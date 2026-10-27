import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isDemoEnabled } from "@/server/demo";

export default function DemoLayout({ children }: { children: ReactNode }) {
  if (!isDemoEnabled()) notFound();
  return children;
}
