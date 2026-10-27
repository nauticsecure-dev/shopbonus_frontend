import {ClaimPage} from "@/features/live/LivePages";
export default async function ClaimLinkPage({params}:{params:Promise<{token:string}>}){return <ClaimPage token={(await params).token}/>;}
