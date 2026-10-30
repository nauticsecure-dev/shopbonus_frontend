"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/store/SessionContext";
import { deriveUiRole } from "@/lib/auth";

/**
 * Protects Super Admin routes. Authorization is still enforced by Laravel
 * `platform:super_admin` middleware — this only keeps the UI from flashing.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const user = session?.user;
  const isAdmin = !!user && deriveUiRole(user) === "super_admin";

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/account?mode=login&next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!user.email_verified) {
      router.replace("/account?verify=1");
      return;
    }
    if (!isAdmin) {
      router.replace("/account?mode=login");
    }
  }, [ready, user, isAdmin, pathname, router]);

  if (!ready || !isAdmin) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-muted" role="status">
        Cockpit laden…
      </div>
    );
  }

  return children;
}
