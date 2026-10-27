"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/features/auth/SessionContext";
export interface Toast { id: number; title: string; message: string; kind: "success" | "error" | "info" }
const Ctx = createContext<{balance:number|null;profile:{firstName:string;email:string};toasts:Toast[];pushToast:(t:Omit<Toast,"id">)=>void;dismissToast:(id:number)=>void;copyCode:(code:string)=>Promise<void>;justCopied:string|null} | null>(null);
export function ShopBonusProvider({children}:{children:React.ReactNode}) {
  const {session} = useSession();
  const [wallet,setWallet] = useState<{owner:string;balance:number|null}>({owner:"",balance:null});
  const [toasts,setToasts] = useState<Toast[]>([]);
  const [justCopied,setJustCopied] = useState<string|null>(null);
  const pushToast=useCallback((t:Omit<Toast,"id">)=>{const id=Date.now()+Math.random();setToasts(p=>[...p.slice(-2),{...t,id}]);window.setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)),5000);},[]);
  useEffect(()=>{let active=true;if(session?.email_verified) api<{data:{balances:{eur_credit:{available:number}}}}>("consumer/wallet").then(r=>{if(active)setWallet({owner:session.id,balance:r.data.balances.eur_credit.available/100});}).catch(()=>{if(active)setWallet({owner:"",balance:null});});return()=>{active=false;};},[session]);
  const profile=useMemo(()=>({firstName:session?.first_name||"",email:session?.email||""}),[session]);
  const copyCode=useCallback(async(code:string)=>{try{await navigator.clipboard.writeText(code);setJustCopied(code);window.setTimeout(()=>setJustCopied(null),1800);pushToast({title:"Code gekopieerd",message:"De code staat op je klembord.",kind:"success"});}catch{pushToast({title:"Kopiëren mislukt",message:"Selecteer en kopieer de code handmatig.",kind:"error"});}},[pushToast]);
  return <Ctx.Provider value={{balance:session?.id===wallet.owner?wallet.balance:null,profile,toasts,pushToast,dismissToast:id=>setToasts(p=>p.filter(t=>t.id!==id)),copyCode,justCopied}}>{children}</Ctx.Provider>;
}
export function useShopBonus(){const value=useContext(Ctx);if(!value)throw new Error("ShopBonusProvider required");return value;}
