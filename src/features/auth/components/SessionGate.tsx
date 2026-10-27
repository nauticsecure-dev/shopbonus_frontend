"use client";
import Link from "next/link";
import { useSession } from "@/features/auth/SessionContext";
export default function SessionGate({children}:{children:React.ReactNode}) {
 const {session,ready,error}=useSession();
 if(!ready)return <p className="p-10" role="status">Sessie laden…</p>;
 if(!session)return <div className="p-10"><p role="alert">{error||"Log in om verder te gaan."}</p><Link className="text-brand" href="/account?mode=login">Inloggen →</Link></div>;
 if(!session.email_verified)return <div className="p-10"><Link className="text-brand" href="/account?verify=1">Bevestig eerst je e-mailadres →</Link></div>;
 return children;
}
