import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Rohmilch-Atlas – Rohmilchautomaten & Hofläden in Deutschland",
    template: "%s | Rohmilch-Atlas",
  },
  description:
    "Finde frische Rohmilch in deiner Nähe: Rohmilchautomaten, Milchtankstellen, Hofläden und Bauernhöfe in ganz Deutschland auf einer Karte – mit Öffnungszeiten, Adressen und Navigation.",
  applicationName: "Rohmilch-Atlas",
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "Rohmilch-Atlas",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#1f4d33",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-scroll-behavior="smooth">
      <body className="min-h-dvh">
        <a href="#inhalt" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
          Zum Inhalt springen
        </a>
        <Header />
        <main id="inhalt">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
