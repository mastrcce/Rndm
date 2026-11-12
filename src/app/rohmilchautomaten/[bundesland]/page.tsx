import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinderProvider } from "@/components/finder/finder-context";
import { FinderSection } from "@/components/finder/finder-section";
import { SearchBox } from "@/components/finder/search-box";
import { RegionList } from "@/components/region-list";
import { SafetyNotice } from "@/components/safety-notice";
import { getPlaceBySlug, getPointsWhere, getTopCities } from "@/lib/locations";
import { stateBySlug } from "@/lib/states";

export const revalidate = 3600;

type Props = { params: Promise<{ bundesland: string }> };

/** Seiten werden beim ersten Aufruf erzeugt (ISR), damit der Build keine Datenbank braucht. */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bundesland } = await params;
  const s = stateBySlug(bundesland);
  if (!s) return { title: "Nicht gefunden" };
  return {
    title: `Rohmilchautomaten in ${s.name} – Milchtankstellen & Hofläden`,
    description: `Alle erfassten Rohmilchautomaten, Milchtankstellen und Hofläden mit Milchverkauf in ${s.name} auf einer Karte – mit Adressen, Öffnungszeiten und Navigation.`,
    alternates: { canonical: `/rohmilchautomaten/${s.slug}` },
  };
}

export default async function StatePage({ params }: Props) {
  const { bundesland } = await params;
  const s = stateBySlug(bundesland);
  if (!s) notFound();
  const [points, place, cities] = await Promise.all([
    getPointsWhere("state = $1 and 'milk' = any(categories)", [s.name], 1000),
    getPlaceBySlug("state", s.slug),
    getTopCities(500, 1),
  ]);
  const stateCities = cities.filter((c) => c.state === s.name).slice(0, 40);
  const vending = points.filter((p) => p.type === "raw_milk_vending" || p.type === "vending_machine").length;
  const sorted = [...points].sort((a, b) => Number(a.gen) - Number(b.gen) || b.q - a.q);
  const bbox = (place?.bbox as [number, number, number, number] | undefined) ?? null;

  return (
    <FinderProvider>
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6">
        <nav aria-label="Brotkrumen" className="text-sm text-muted">
          <Link href="/" className="hover:text-forest-800">Start</Link> / <Link href="/rohmilchautomaten" className="hover:text-forest-800">Rohmilchautomaten</Link> / <span className="text-forest-900">{s.name}</span>
        </nav>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold sm:text-5xl">Rohmilch in {s.name}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          In {s.name} sind {points.length.toLocaleString("de-DE")} Verkaufsstellen mit Milch ab Hof erfasst, davon {vending.toLocaleString("de-DE")} Automaten
          und {points.filter((p) => p.raw === "confirmed").length.toLocaleString("de-DE")} mit ausdrücklich bestätigter Rohmilch.
        </p>
        <div className="mt-6 max-w-2xl"><SearchBox size="md" /></div>
        {stateCities.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2">
            {stateCities.map((c) => (
              <li key={c.slug}>
                <Link href={`/rohmilch-in-${c.slug}`} className="inline-flex rounded-full border border-line bg-white px-3 py-1.5 text-sm text-forest-900 hover:border-sage-400">
                  {c.city} <span className="ml-1.5 text-muted">{c.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <SafetyNotice className="mt-8" compact />
      </section>
      <FinderSection initialBbox={bbox} title={`Karte: ${s.name}`} />
      <RegionList points={sorted} title={`Alle Standorte in ${s.name}`} />
    </FinderProvider>
  );
}
