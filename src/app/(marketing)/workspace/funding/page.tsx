import {FundingReturnPage} from "@/features/live/LivePages";
export default async function FundingPage({searchParams}:{searchParams:Promise<{top_up?:string}>}){return <FundingReturnPage id={(await searchParams).top_up||""}/>;}
