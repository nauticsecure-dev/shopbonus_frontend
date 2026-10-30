"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/store/SessionContext";
import { hasApprovedWorkspace, merchantHasShop } from "@/lib/auth";

/**
 * Protects merchant dashboard routes using server-owned /me state only.
 * Client role labels are never treated as authorization.
 *
 * Draft / pending webshops are redirected to compliance onboarding so
 * verification and agreement cannot be skipped via the URL bar.
 */
export default function SessionGate({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const user = session?.user;
  const hasShop = merchantHasShop(user);
  const approved = hasApprovedWorkspace(user);
  const isSuperAdmin = !!user?.roles.includes("super_admin");
  const allowed = !!user && user.email_verified && user.status === "active" && (approved || isSuperAdmin);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/account?mode=login&role=merchant&next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!user.email_verified) {
      router.replace("/account?verify=1");
      return;
    }
    if (!hasShop && (user.destination === "webshop_setup" || user.onboarding_intent === "merchant")) {
      router.replace("/voor-webshops/aanmelden");
      return;
    }
    if (hasShop && !approved && !isSuperAdmin) {
      router.replace("/onboarding");
      return;
    }
    if (!allowed) {
      router.replace("/account?mode=login&role=merchant");
    }
  }, [ready, user, hasShop, approved, isSuperAdmin, allowed, pathname, router]);

  if (!ready || !allowed) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-muted" role="status">
        Je dashboard wordt geladen…
      </div>
    );
  }

  return children;
}
