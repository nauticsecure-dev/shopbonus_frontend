import {ResetPasswordPage} from "@/features/live/LivePages";
export default async function ResetPage({searchParams}:{searchParams:Promise<{token?:string;email?:string}>}){const p=await searchParams;return <ResetPasswordPage token={p.token||""} email={p.email||""}/>;}
