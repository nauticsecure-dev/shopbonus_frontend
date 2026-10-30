import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { SessionProvider } from "@/store/SessionContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Toasts from "@/components/Toasts";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { ShopBonusProvider } from "@/store/ShopBonusContext";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { DEFAULT_LOCALE } from "@/types/locale";

const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  weight: "400 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShopBonus — Samen maken we online shoppen voordeliger",
  description:
    "Gebruik je ShopBonus-tegoed voor exclusieve kortingsvouchers bij honderden webshops. Eenvoudig, transparant en voor beide kanten waardevol.",
  applicationName: "ShopBonus",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "ShopBonus",
    description:
      "Cashback, kortingsvouchers en eerlijke deals bij aangesloten webshops.",
    siteName: "ShopBonus",
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: "ShopBonus" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopBonus",
    description:
      "Cashback, kortingsvouchers en eerlijke deals bij aangesloten webshops.",
    images: ["/brand/og.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: extensions (e.g. Loom) inject attrs on html/body before hydrate.
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <body
        className={`${jakarta.className} min-h-screen bg-mist text-ink antialiased`}
        suppressHydrationWarning
      >
        <LocaleProvider>
          <SessionProvider>
            <ShopBonusProvider>
              <ImpersonationBanner />
              <Header />
              <main className="min-h-[60vh]">{children}</main>
              <Footer />
              <CookieConsentBanner />
              <Toasts />
            </ShopBonusProvider>
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
