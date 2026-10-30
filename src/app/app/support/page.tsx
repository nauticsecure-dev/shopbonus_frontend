"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SupportExperience from "@/components/support/SupportExperience";

function SupportPageInner() {
  const params = useSearchParams();
  const conversation = params.get("conversation");

  return <SupportExperience mode="consumer" initialConversationId={conversation} />;
}

export default function ConsumerSupportPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">Support laden…</p>}>
      <SupportPageInner />
    </Suspense>
  );
}
