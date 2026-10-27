import {ShopDetail} from "@/features/live/LivePages";
export default async function ShopPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <ShopDetail slug={slug}/>;}
