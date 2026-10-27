import {CheckoutReturnPage} from "@/features/live/LivePages";
export default async function CheckoutPage({params}:{params:Promise<{id:string}>}){return <CheckoutReturnPage id={(await params).id}/>;}
