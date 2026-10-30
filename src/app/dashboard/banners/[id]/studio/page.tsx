"use client";

import { useParams } from "next/navigation";
import LiveEditorShell from "@/components/banners/LiveEditorShell";
import { useWorkspace } from "@/store/WorkspaceContext";

export default function BannerLiveStudioPage() {
  const params = useParams();
  const bannerId = String(params.id ?? "");
  const { workspaceId, current } = useWorkspace();

  if (!bannerId) {
    return <p className="p-8 text-sm font-semibold text-muted">Banner not found.</p>;
  }

  return <LiveEditorShell workspaceId={workspaceId} bannerId={bannerId} shopName={current?.name ?? "Webshop"} />;
}
