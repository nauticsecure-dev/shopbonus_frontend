import SessionGate from "@/features/auth/components/SessionGate";
import { MerchantLayout } from "@/features/live/LivePages";
export default function DashboardLayout({children}:{children:React.ReactNode}) {return <SessionGate><MerchantLayout>{children}</MerchantLayout></SessionGate>;}
