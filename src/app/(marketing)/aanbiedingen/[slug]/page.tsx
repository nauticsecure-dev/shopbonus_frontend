import {OfferDetail} from "@/features/live/LivePages";
export default async function OfferPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <OfferDetail key={slug} slug={slug}/>;}
