import { Suspense } from "react";
import WorkspaceDestinationGate from "@/components/support/WorkspaceDestinationGate";
import SessionGate from "@/components/SessionGate";
import { WorkspaceProvider } from "@/store/WorkspaceContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate>
      <WorkspaceProvider><Suspense><WorkspaceDestinationGate>{children}</WorkspaceDestinationGate></Suspense></WorkspaceProvider>
    </SessionGate>
  );
}
