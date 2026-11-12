import type { Metadata } from "next";
import { CategoryCards } from "@/components/category-cards";
import { getStats } from "@/lib/locations";
import { EMPTY_STATS, safe } from "@/lib/server/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Hofprodukte: Milch, Eier, Honig, Fleisch & Käse direkt vom Hof",
  description: "Finde Rohmilch, Eier, Honig, Fleisch, Wurst und Käse direkt vom Erzeuger – Automaten, Hofläden und Imkereien in ganz Deutschland.",
  alternates: { canonical: "/produkte" },
};

export default async function ProductsPage() {
  const { data: stats } = await safe(getStats, EMPTY_STATS);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="max-w-3xl text-4xl font-medium sm:text-5xl">Hofprodukte direkt vom Erzeuger</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Neben Rohmilch findest du hier Eier, Honig, Fleisch und Käse – überall dort, wo die Datenquelle das Produkt ausdrücklich nennt.
      </p>
      <div className="mt-10"><CategoryCards counts={stats.byCategory} /></div>
    </div>
  );
}
