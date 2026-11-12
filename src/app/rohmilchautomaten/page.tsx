import type { Metadata } from "next";
import Link from "next/link";
import { FinderProvider } from "@/components/finder/finder-context";
import { FinderSection } from "@/components/finder/finder-section";
import { SearchBox } from "@/components/finder/search-box";
import { getStateCounts, getTopCities } from "@/lib/locations";
import { safe } from "@/lib/server/safe";
import { STATES } from "@/lib/states";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Rohmilchautomaten in Deutschland – nach Bundesland",
  description: "Übersicht aller erfassten Rohmilchautomaten und Milchtankstellen in Deutschland, sortiert nach Bundesland und Stadt – mit Karte, Öffnungszeiten und Navigation.",
  alternates: { canonical: "/rohmilchautomaten" },
};

export default async function VendingOverview() {
  const [{ data: counts }, { data: cities }] = await Promise.all([safe(getStateCounts, []), safe(() => getTopCities(40, 2), [])]);
  const total = counts.reduce((s, c) => s + c.vending, 0);
  return (
    <FinderProvider initialFilters={{ types: ["raw_milk_vending", "vending_machine"] }}>
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6">
        <h1 className="max-w-3xl text-4xl font-medium sm:text-5xl">Rohmilchautomaten in Deutschland</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          {total.toLocaleString("de-DE")} Milch- und Verkaufsautomaten mit Milch sind derzeit erfasst. Wähle dein Bundesland oder suche direkt nach deinem Ort.
        </p>
        <div className="mt-6 max-w-2xl"><SearchBox size="md" /></div>
        <ul className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STATES.map((s) => {
            const c = counts.find((x) => x.state === s.name);
            return (
              <li key={s.slug}>
                <Link href={`/rohmilchautomaten/${s.slug}`} className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-sm hover:border-sage-400 hover:shadow-soft">
                  <span className="font-medium text-forest-900">{s.name}</span>
                  <span className="text-muted"><span className="tabular-nums">{c?.vending ?? 0}</span> Automaten</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <FinderSection title="Milch- und Verkaufsautomaten auf der Karte" />
      {cities.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-medium sm:text-3xl">Rohmilch in deiner Stadt</h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={c.slug}>
                <Link href={`/rohmilch-in-${c.slug}`} className="inline-flex rounded-full border border-line bg-white px-3 py-1.5 text-sm text-forest-900 hover:border-sage-400">
                  {c.city} <span className="ml-1.5 text-muted">{c.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </FinderProvider>
  );
}
