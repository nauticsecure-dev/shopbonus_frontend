import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { connection } from "next/server";
import AppProviders from "@/providers/AppProviders";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Toasts from "@/components/Toasts";

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

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Nonces require a fresh render for each request.
  await connection();
  return (
    <html lang="nl">
      <body className={`${jakarta.className} min-h-screen bg-mist text-ink antialiased`}>
        <AppProviders>
          <Header />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
          <Toasts />
        </AppProviders>
      </body>
    </html>
  );
}
