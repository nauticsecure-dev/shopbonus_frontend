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
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body className={`${jakarta.className} min-h-screen bg-mist text-ink antialiased`}>
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
