import Link from "next/link";

export default function Logo({ light = false }: { light?: boolean }) {
  return <Link href="/" aria-label="ShopBonus startpagina" className="flex shrink-0 select-none items-center gap-2.5">
    <svg aria-hidden="true" width="35" height="42" viewBox="0 0 35 42" fill="none" className={light ? "text-white" : "text-brand"}>
      <path d="M10 14V10a7.5 7.5 0 0 1 15 0v4" stroke="currentColor" strokeWidth="3.3"/>
      <path d="M6 13h23l3 25H3l3-25Z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M10 20h15v13H10V20Z" fill={light ? "#0b74ff" : "white"}/>
      <path d="m10 20 7.5 5L25 20" stroke="currentColor" strokeWidth="2.5"/>
    </svg>
    <span className={`text-[25px] font-extrabold tracking-[-1.2px] sm:text-[28px] ${light ? "text-white" : "text-navy"}`}>Shop<span className={light ? "" : "text-brand"}>Bonus</span></span>
  </Link>;
}
