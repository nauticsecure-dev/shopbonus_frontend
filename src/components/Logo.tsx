import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  /** White wordmark for blue/navy bars; full colour lockup on light backgrounds. */
  light?: boolean;
  /** Hide the text and show only the ribbon mark (favicon-style). */
  markOnly?: boolean;
  className?: string;
  href?: string;
};

export default function Logo({
  light = false,
  markOnly = false,
  className = "",
  href = "/",
}: LogoProps) {
  const content = light || markOnly ? (
    <span className="flex items-center gap-2.5">
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={40}
        height={41}
        className="h-9 w-auto sm:h-10"
        priority
      />
      {!markOnly && (
        <span
          className={`text-[25px] font-extrabold tracking-[-1.2px] sm:text-[28px] ${
            light ? "text-white" : "text-navy"
          }`}
        >
          Shop<span className={light ? "text-white" : "text-brand"}>Bonus</span>
        </span>
      )}
    </span>
  ) : (
    <Image
      src="/brand/logo-full.png"
      alt="ShopBonus"
      width={180}
      height={44}
      className="h-9 w-auto sm:h-10"
      priority
    />
  );

  return (
    <Link
      href={href}
      aria-label="ShopBonus startpagina"
      className={`flex shrink-0 select-none items-center ${className}`}
    >
      {content}
    </Link>
  );
}
