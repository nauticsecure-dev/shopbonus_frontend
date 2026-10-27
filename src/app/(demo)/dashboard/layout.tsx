import SessionGate from "@/features/auth/components/SessionGate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SessionGate>{children}</SessionGate>;
}
