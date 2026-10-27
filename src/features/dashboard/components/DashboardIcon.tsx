import type { SVGProps } from "react";

export type DashboardIconName =
  | "grid"
  | "store"
  | "tag"
  | "bell"
  | "settings"
  | "chart"
  | "users"
  | "ticket"
  | "coins"
  | "wallet"
  | "list"
  | "eye"
  | "cursor"
  | "cart"
  | "check"
  | "clock"
  | "sync"
  | "chat"
  | "alert"
  | "gift"
  | "search"
  | "calendar"
  | "arrow"
  | "plus"
  | "external"
  | "download"
  | "upload"
  | "copy"
  | "edit"
  | "pause"
  | "play"
  | "chevron"
  | "filter"
  | "menu"
  | "close";

const paths: Record<DashboardIconName, React.ReactNode> = {
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  store: <><path d="M4 10V7.5l2-3h12l2 3V10" /><path d="M5 10v9a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-9" /><path d="M4 10a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /><path d="M10 20v-5h4v5" /></>,
  tag: <><path d="m20.5 13-7.6 7.2a2 2 0 0 1-2.8 0L3.8 14a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h7.6a2 2 0 0 1 1.4.6l6.3 6.3a2.2 2.2 0 0 1 0 3.1Z" /><circle cx="8" cy="8" r="1.3" /></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.3 1-1.5 2.6-1.6-.6a7.7 7.7 0 0 1-1.7 1l-.3 1.7h-3l-.3-1.7a7.7 7.7 0 0 1-1.7-1l-1.6.6-1.5-2.6 1.3-1a7.8 7.8 0 0 1 0-2l-1.3-1 1.5-2.6 1.6.6a7.7 7.7 0 0 1 1.7-1L12.2 7h3l.3 1.7a7.7 7.7 0 0 1 1.7 1l1.6-.6 1.5 2.6-1.3 1a7.8 7.8 0 0 1 .4 2.3Z" transform="translate(-1.5 -1.5)" /></>,
  chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /><path d="M17 6h3v3" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5a3.4 3.4 0 0 1 0 6.5M18 14a5.5 5.5 0 0 1 3.5 5" /></>,
  ticket: <><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.2a2.8 2.8 0 0 0 0 5.6V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.2a2.8 2.8 0 0 0 0-5.6V7Z" /><path d="M13 7.5v2m0 5v2" strokeDasharray="1 1" /></>,
  coins: <><ellipse cx="9" cy="6" rx="6" ry="2.5" /><path d="M3 6v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V6M3 10v4c0 1.4 2.7 2.5 6 2.5 1.1 0 2.1-.1 3-.4" /><ellipse cx="16" cy="15" rx="5" ry="2.2" /><path d="M11 15v3c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2v-3" /></>,
  wallet: <><path d="M4 6.5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5Z" /><path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H18" /><path d="M15 13h6" /><circle cx="16" cy="13" r=".7" fill="currentColor" /></>,
  list: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  eye: <><path d="M2.5 12s3.4-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.4 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.7" /></>,
  cursor: <><path d="m5 3 14 11-7 1.2-3.4 6L5 3Z" /><path d="m12 15 4 5" /></>,
  cart: <><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.5L22 8H6" /><circle cx="10" cy="20" r="1.2" /><circle cx="18" cy="20" r="1.2" /></>,
  check: <><path d="m5 12.5 4.2 4.2L19.5 6.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  sync: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3" /></>,
  chat: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.7-.8L3 20l1.4-4.2A7.1 7.1 0 0 1 4 12c0-4.4 3.6-8 8-8s8 3.1 8 7.5Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
  alert: <><path d="m10.3 4.2-7.5 13a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 3h.01" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8h14v-8M12 8v12M12 8s-4 0-5.5-1.5A1.5 1.5 0 0 1 8 4c1 0 3 2 4 4Zm0 0s4 0 5.5-1.5A1.5 1.5 0 0 0 16 4c-1 0-3 2-4 4Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  arrow: <><path d="M4 12h15m-6-6 6 6-6 6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  external: <><path d="M14 5h5v5M19 5 10 14" /><path d="M11 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M5 17v3h14v-3" /></>,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M5 16v4h14v-4" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  edit: <><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" /><path d="m14.5 7.5 3 3" /></>,
  pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
  play: <><path d="M8 5v14l11-7L8 5Z" /></>,
  chevron: <><path d="m9 18 6-6-6-6" /></>,
  filter: <><path d="M4 5h16l-6.5 7.5v5l-3 1.5v-6.5L4 5Z" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
};

export default function DashboardIcon({
  name,
  size = 20,
  strokeWidth = 2,
  className,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: DashboardIconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
