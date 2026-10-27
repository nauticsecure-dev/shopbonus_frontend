import {ContentPage} from "@/features/live/LivePages";
export default async function InformationPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <ContentPage slug={slug}/>;}
