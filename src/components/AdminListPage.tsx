"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import DashboardShell from "@/components/DashboardShell";
import { DashboardHeading, Panel } from "@/components/DashboardPrimitives";

export default function AdminListPage({
  title,
  accent,
  subtitle,
  children,
  backHref = "/admin",
}: {
  title: string;
  accent?: string;
  subtitle?: string;
  children: ReactNode;
  backHref?: string;
}) {
  return (
    <DashboardShell admin>
      <div className="mb-4">
        <Link href={backHref} className="text-sm font-extrabold text-brand hover:underline">
          ← Terug naar Cockpit
        </Link>
      </div>
      <DashboardHeading title={title} accent={accent} subtitle={subtitle} />
      <Panel>{children}</Panel>
    </DashboardShell>
  );
}
