"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/features/auth/SessionContext";

export default function SessionGate({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = session?.role === "merchant";
  useEffect(() => {
    if (ready && !allowed) router.replace(`/account?mode=login&role=merchant&next=${encodeURIComponent(pathname)}`);
  }, [ready, allowed, pathname, router]);
  if (!ready || !allowed) return <div className="grid min-h-[70vh] place-items-center text-muted" role="status">Je dashboard wordt geladen…</div>;
  return children;
}
