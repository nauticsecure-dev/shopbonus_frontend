import AdminGate from "@/components/AdminGate";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}
