"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/store/WorkspaceContext";
import { useLocale } from "@/i18n/LocaleContext";

/** Do not mount destination pages (and their queries) until the server authorizes selection. */
export default function WorkspaceDestinationGate({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const target = params.get("workspace");
  const { current, workspaces, select } = useWorkspace();
  const { locale } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const allowed = !target || workspaces.some((w) => w.id === target);
  useEffect(() => {
    if (!target || !allowed || current?.id === target) return;
    let cancelled = false;
    void select(target).catch(() => { if (!cancelled) setError(locale === "en" ? "Workspace selection failed." : "Webshop selecteren mislukt."); });
    return () => { cancelled = true; };
  }, [target, allowed, current?.id, select, locale]);
  if (!allowed) return <p role="alert">{locale === "en" ? "Workspace unavailable." : "Webshop niet beschikbaar."}</p>;
  if (error) return <p role="alert">{error}</p>;
  if (target && current?.id !== target) return <p role="status">{locale === "en" ? "Selecting workspace…" : "Webshop selecteren…"}</p>;
  return children;
}
