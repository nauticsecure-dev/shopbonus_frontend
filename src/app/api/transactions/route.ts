import {NextRequest} from "next/server";
import {forward} from "@/server/backend";
export async function GET(request:NextRequest){return forward(request,{params:Promise.resolve({path:["api","v1","consumer","wallet","transactions"]})});}
