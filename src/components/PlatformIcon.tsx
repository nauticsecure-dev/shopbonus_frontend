import type { ReactNode } from "react";

/** Recognizable monochrome brand marks for commerce platforms. */

type Props = {
  platform: string;
  className?: string;
  title?: string;
};

const BOX = "h-full w-full";

function Svg({
  children,
  viewBox = "0 0 24 24",
  className = BOX,
}: {
  children: ReactNode;
  viewBox?: string;
  className?: string;
}) {
  return (
    <svg className={className} viewBox={viewBox} fill="currentColor" aria-hidden>
      {children}
    </svg>
  );
}

function mark(platform: string): ReactNode {
  switch (platform) {
    case "shopify":
      return (
        <Svg>
          <path d="M15.34 3.5c-.14 0-.28.02-.4.07l-.02.01c-.25.1-2.55.98-2.55.98s-1.66-1.3-1.86-1.45c-.2-.15-.56-.22-.56-.22l-.4 13.7 10.14 1.76V5.38s-1.6-.2-2.34-.4c-.4-.1-.9-.3-1.2-.48-.28-.16-.5-.36-.81-.5Z" opacity=".95" />
          <path d="M14.2 6.4s-.9.3-1.2.4v8.7l1.7.3V6.9c-.16-.12-.33-.3-.5-.5Zm-3.1.95c-.35.1-.7.18-1 .24v8.55l1.55.28V7.55c-.18-.07-.36-.14-.55-.2Z" />
        </Svg>
      );
    case "woocommerce":
      return (
        <Svg>
          <path d="M3.2 8.2c.4-1.6 1.7-2.7 3.4-2.7 1.3 0 2.3.7 2.9 1.9.6-1.2 1.6-1.9 2.9-1.9 1.7 0 3 1.1 3.4 2.7L18.2 18H15l-1.9-7.6c-.15-.6-.5-.95-1-.95-.55 0-.9.4-1 .95L9.3 18H6.1L3.2 8.2Zm13.4 0c.35-1.35 1.4-2.2 2.8-2.2.4 0 .8.08 1.15.22l-.55 2.05a1.6 1.6 0 0 0-.7-.15c-.7 0-1.15.5-1.3 1.2L16.6 18h-3.1l3.1-9.8Z" />
        </Svg>
      );
    case "wix":
      return (
        <Svg>
          <path d="M3 6.5h2.4l1.7 6.4L9.4 6.5h2.3L9.3 17H6.8L5.2 10.8 3.6 17H1.1L3 6.5Zm11.2 0h2.2l2.1 7.2 2.1-7.2H23L19.8 17h-2.4l-2.1-7.1L13.2 17h-2.4l3.4-10.5Z" />
        </Svg>
      );
    case "bigcommerce":
      return (
        <Svg>
          <path d="M4 5.5h9.2c2.9 0 4.8 1.7 4.8 4.2 0 1.7-.9 3-2.3 3.6 1.7.5 2.8 1.9 2.8 3.8 0 2.8-2.1 4.4-5.2 4.4H4V5.5Zm3.1 2.5v3.8h5.3c1.2 0 1.9-.6 1.9-1.9s-.7-1.9-1.9-1.9H7.1Zm0 6.1v4.2h5.8c1.4 0 2.2-.7 2.2-2.1s-.8-2.1-2.2-2.1H7.1Z" />
        </Svg>
      );
    case "ecwid":
      return (
        <Svg>
          <path d="M12 3.2 4.5 7v10L12 20.8 19.5 17V7L12 3.2Zm0 2.3 5.2 2.6v7.8L12 18.5l-5.2-2.6V8.1L12 5.5Zm0 2.2-3.2 1.6v5.4L12 16.3l3.2-1.6V9.3L12 7.7Z" />
        </Svg>
      );
    case "lightspeed_c":
    case "lightspeed_e":
      return (
        <Svg>
          <path d="M5 4.5h3.2L14 12l-1.8 2.2L5 4.5Zm5.2 0H19v2.8h-5.4L5 19.5H1.8L10.2 4.5Zm3.5 9.2L19 19.5h-3.4l-4.2-5.2 2.3-.6Z" />
        </Svg>
      );
    case "prestashop":
      return (
        <Svg>
          <path d="M12 3c4.6 0 8.2 2.9 8.2 7.1 0 3.4-2.2 5.7-5.5 6.5L16 21h-3.2l-1.2-3.8H9.4L8.2 21H5l1.4-4.3C4.2 15.5 3 13.2 3 10.1 3 5.9 6.8 3 12 3Zm0 2.5c-3 0-5.2 1.7-5.2 4.6S9 14.7 12 14.7s5.2-1.7 5.2-4.6S15 5.5 12 5.5Zm-1.6 2.3h3.2v1.5h-1v2.8h-1.2V9.3h-1V7.8Z" />
        </Svg>
      );
    case "opencart":
      return (
        <Svg>
          <path d="M7.2 6.2h13.1l-1.2 6.4H8.9L7.2 6.2Zm.8 8.2h10.4a1.4 1.4 0 0 1 0 2.8H7.4a1.5 1.5 0 1 1 0-3h.6ZM9 19.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Zm8.2 0a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6ZM4.2 4.2h1.8l.4 2H4.2V4.2Z" />
        </Svg>
      );
    case "shopware6":
      return (
        <Svg>
          <path d="M12 2.8c5 0 9.2 4 9.2 9.2S17 21.2 12 21.2 2.8 17.2 2.8 12 7 2.8 12 2.8Zm0 2.4a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6Zm-.2 2.3c1.9 0 3.3.7 4.2 1.9l-1.7 1.2c-.5-.7-1.3-1.1-2.4-1.1-1.7 0-2.9 1.2-2.9 3s1.2 3 2.9 3c1.1 0 1.9-.4 2.4-1.1l1.7 1.2c-.9 1.2-2.3 1.9-4.2 1.9-3.1 0-5.3-2.2-5.3-5s2.2-5 5.3-5Z" />
        </Svg>
      );
    case "magento":
      return (
        <Svg>
          <path d="M12 2.5 4 6.8v10.4L12 21.5l8-4.3V6.8L12 2.5Zm0 2.6 5.5 3v2.2L12 7.4 6.5 10.1V7.9L12 5.1Zm-5.5 6.1 5.5 3 5.5-3v5.2L12 18.9l-5.5-2.5v-5.2Z" />
        </Svg>
      );
    case "squarespace":
      return (
        <Svg>
          <path d="M12.1 4.2c2.4 0 4.2 1.2 5.3 2.8l-1.8 1.5c-.8-1.1-1.9-1.9-3.5-1.9-1.4 0-2.4.7-2.4 1.8 0 .9.6 1.4 2.5 2.1 2.7 1 4.4 2.1 4.4 4.4 0 2.6-2.1 4.3-5 4.3-2.6 0-4.6-1.3-5.6-3.1l1.9-1.4c.8 1.3 2 2.1 3.8 2.1 1.5 0 2.5-.7 2.5-1.9 0-1-.7-1.5-2.7-2.2-2.6-.9-4.2-2.1-4.2-4.3 0-2.5 2-4.2 4.8-4.2Z" />
        </Svg>
      );
    case "mijnwebwinkel":
      return (
        <Svg>
          <path d="M4 10.2 12 4l8 6.2V20H4v-9.8Zm3 1.4V17h3.2v-3.2h3.6V17H17v-5.4l-5-3.8-5 3.8Z" />
        </Svg>
      );
    case "ccv":
      return (
        <Svg>
          <path d="M4.2 8.2C5.2 5.8 7.5 4.2 10.2 4.2c2 0 3.5.7 4.6 2l-1.8 1.6c-.7-.8-1.6-1.2-2.8-1.2-1.8 0-3.1 1.2-3.5 3-.3 1.4-.3 2.8 0 4.2.4 1.8 1.7 3 3.5 3 1.2 0 2.1-.4 2.8-1.2l1.8 1.6c-1.1 1.3-2.6 2-4.6 2-2.7 0-5-1.6-6-4-.5-1.7-.5-3.7 0-5.4Zm11.2-.2h2.2v2.6H22v2.2h-4.4v2.8h-2.2V8Z" />
        </Svg>
      );
    default:
      return (
        <Svg>
          <path d="M5 7.5h14v2.2H5V7.5Zm0 4.4h10v2.2H5v-2.2Zm0 4.4h14v2.2H5v-2.2Z" />
        </Svg>
      );
  }
}

/** Brand tint per platform for the icon plate. */
export function platformIconTone(platform: string): string {
  switch (platform) {
    case "shopify":
      return "bg-[#96bf48]/text-white";
    case "woocommerce":
      return "bg-[#96588a] text-white";
    case "wix":
      return "bg-[#0C6EFC] text-white";
    case "bigcommerce":
      return "bg-[#121118] text-white";
    case "ecwid":
      return "bg-[#1F8A70] text-white";
    case "lightspeed_c":
    case "lightspeed_e":
      return "bg-[#E41E26] text-white";
    case "prestashop":
      return "bg-[#DF0067] text-white";
    case "opencart":
      return "bg-[#23A8E0] text-white";
    case "shopware6":
      return "bg-[#189EFF] text-white";
    case "magento":
      return "bg-[#F26322] text-white";
    case "squarespace":
      return "bg-[#000000] text-white";
    case "mijnwebwinkel":
      return "bg-[#FF6B00] text-white";
    case "ccv":
      return "bg-[#00A3E0] text-white";
    default:
      return "bg-blue-50 text-brand";
  }
}

export default function PlatformIcon({ platform, className = "h-6 w-6", title }: Props) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`} title={title} role="img" aria-label={title || platform}>
      {mark(platform)}
    </span>
  );
}
