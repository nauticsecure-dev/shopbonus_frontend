"use client";
import Link from "next/link";
import type {Webshop,Offer} from "@/fixtures/dummy";
export function WebshopCard({shop}:{shop:Webshop}){return <Link className="surface p-6" href={"/webshops/"+shop.slug}><h3 className="text-xl font-bold">{shop.name}</h3><p>{shop.description}</p></Link>;}
export function OfferTicket({shop}:{shop:Webshop;offer:Offer}){return <Link className="text-brand" href={"/webshops/"+shop.slug}>Bekijk actuele aanbiedingen →</Link>;}
export function Eyebrow({children}:{children:React.ReactNode}){return <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-brand">{children}</p>;}
