import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinderProvider } from "@/components/finder/finder-context";
import { FinderSection } from "@/components/finder/finder-section";
import { RegionList } from "@/components/region-list";
import { getNearby, getPlaceBySlug } from "@/lib/locations";
import { stateByName } from "@/lib/states";

export const revalidate = 3600;

const RADIUS_KM = 20;

type Props = { params: Promise<{ city: string }> };

/** Seiten werden beim ersten Aufruf erzeugt und danach zwischengespeichert (ISR). */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const p = await getPlaceBySlug("city", city).catch(() => null);
  if (!p) return { title: "Nicht gefunden", robots: { index: false } };
  return {
    title: `Rohmilch in ${p.name} – Milchautomaten & Hofläden in der Nähe`,
    description: `Rohmilchautomaten, Milchtankstellen und Hofläden in und um ${p.name} (${RADIUS_KM} km Umkreis) – mit Karte, Öffnungszeiten und Navigation.`,
    alternates: { canonical: `/rohmilch-in-${p.slug}` },
  };
}

export default async function CityPage({ params }: Props) {
  const { city } = await params;
  const place = await getPlaceBySlug("city", city);
  if (!place) notFound();
  const points = await getNearby(place.latitude, place.longitude, RADIUS_KM, 200, undefined, "milk");
  const state = stateByName(place.state);
  const d = RADIUS_KM / 111;
  const bbox: [number, number, number, number] = [place.longitude - d * 1.5, place.latitude - d, place.longitude + d * 1.5, place.latitude + d];
  // Keine Seiten ohne Inhalt indexieren lassen
  return (
    <FinderProvider>
      {points.length === 0 && <meta name="robots" content="noindex" />}
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6">
        <nav aria-label="Brotkrumen" className="text-sm text-muted">
          <Link href="/" className="hover:text-forest-800">Start</Link>
          {state && <> / <Link href={`/rohmilchautomaten/${state.slug}`} className="hover:text-forest-800">{state.name}</Link></>}
          {" "}/ <span className="text-forest-900">{place.name}</span>
        </nav>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold sm:text-5xl">Rohmilch in {place.name}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          {points.length
            ? `${points.length} Verkaufsstellen mit Milch ab Hof im Umkreis von ${RADIUS_KM} km um ${place.name}${points[0] ? ` – die nächste liegt etwa ${(points[0].distance / 1000).toFixed(1).replace(".", ",")} km vom Ortsmittelpunkt entfernt` : ""}.`
            : `Im Umkreis von ${RADIUS_KM} km um ${place.name} ist derzeit keine Verkaufsstelle erfasst. Kennst du eine? Schlage sie vor!`}
        </p>
      </section>
      <FinderSection initialBbox={bbox} title={`Karte: ${place.name} und Umgebung`} />
      <RegionList points={points} title={`Verkaufsstellen in und um ${place.name}`} />
    </FinderProvider>
  );
}
