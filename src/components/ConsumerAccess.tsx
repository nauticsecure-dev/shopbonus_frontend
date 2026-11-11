"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/store/SessionContext";
import { useLocale } from "@/i18n/LocaleContext";

/** Delay mounting private views (and their requests) until the session is known. */
export default function ConsumerAccess({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  const { dictionary: t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (ready && !session) {
      router.replace(`/inloggen?next=${encodeURIComponent(pathname + window.location.search)}`);
    }
  }, [ready, session, pathname, router]);
  if (!ready || !session) return <p className="p-8 text-center text-muted" role="status">{t.loading}</p>;
  return children;
}
