import SessionGate from "@/components/SessionGate";
import { WorkspaceProvider } from "@/store/WorkspaceContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </SessionGate>
  );
}
