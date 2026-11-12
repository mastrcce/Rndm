import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinderProvider } from "@/components/finder/finder-context";
import { FinderSection } from "@/components/finder/finder-section";
import { RegionList } from "@/components/region-list";
import { CATEGORY_SLUGS, categoryBySlug, type Category } from "@/lib/categories";
import { CATEGORY_PAGE } from "@/lib/category-content";
import { getPlaceBySlug, getPointsWhere } from "@/lib/locations";
import { stateBySlug } from "@/lib/states";

export const revalidate = 3600;

type Props = { params: Promise<{ kategorie: string; bundesland: string }> };

export async function generateStaticParams() {
  return [];
}

function resolve(slug: string): Exclude<Category, "milk"> | null {
  const c = categoryBySlug(slug);
  return c && c !== "milk" ? c : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const c = resolve(p.kategorie);
  const s = stateBySlug(p.bundesland);
  if (!c || !s) return { title: "Nicht gefunden" };
  const page = CATEGORY_PAGE[c];
  return {
    title: `${page.headline(s.name)} – Hofläden & Automaten`,
    description: `${page.intro.replace(/\.$/, "")} in ${s.name} – mit Karte, Öffnungszeiten und Navigation.`,
    alternates: { canonical: `/${CATEGORY_SLUGS[c]}/${s.slug}` },
  };
}

export default async function CategoryStatePage({ params }: Props) {
  const p = await params;
  const c = resolve(p.kategorie);
  const s = stateBySlug(p.bundesland);
  if (!c || !s) notFound();
  const page = CATEGORY_PAGE[c];
  const [points, place] = await Promise.all([
    getPointsWhere("state = $1 and $2 = any(categories)", [s.name, c], 2000),
    getPlaceBySlug("state", s.slug),
  ]);
  const sorted = [...points].sort((a, b) => Number(a.gen) - Number(b.gen) || b.q - a.q);
  return (
    <FinderProvider initialFilters={{ categories: [c] }}>
      {points.length === 0 && <meta name="robots" content="noindex" />}
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6">
        <nav aria-label="Brotkrumen" className="text-sm text-muted">
          <Link href="/" className="hover:text-forest-800">Start</Link> / <Link href={`/${CATEGORY_SLUGS[c]}`} className="hover:text-forest-800">{page.title}</Link> / <span className="text-forest-900">{s.name}</span>
        </nav>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold sm:text-5xl">{page.headline(s.name)}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          {points.length.toLocaleString("de-DE")} Standorte in {s.name} erfasst. {page.intro}
        </p>
      </section>
      <FinderSection initialBbox={(place?.bbox as [number, number, number, number] | undefined) ?? null} title={`Karte: ${page.title} in ${s.name}`} />
      <RegionList points={sorted} title={`Alle Standorte in ${s.name}`} />
    </FinderProvider>
  );
}
