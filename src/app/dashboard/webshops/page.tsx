"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

/** Legacy route — App Store lives at /dashboard/app-store. */
export default function WebshopsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/app-store");
  }, [router]);

  return (
    <DashboardShell>
      <p className="py-16 text-center text-sm font-semibold text-muted">Redirecting to App Store…</p>
    </DashboardShell>
  );
}
