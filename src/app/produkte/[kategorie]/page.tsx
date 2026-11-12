import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIcon } from "@/components/category-icon";
import { FinderProvider } from "@/components/finder/finder-context";
import { FinderSection } from "@/components/finder/finder-section";
import { SearchBox } from "@/components/finder/search-box";
import { CATEGORY_LABELS, CATEGORY_SLUGS, categoryBySlug, type Category } from "@/lib/categories";
import { CATEGORY_PAGE } from "@/lib/category-content";
import { getStateCounts, getTopCities } from "@/lib/locations";
import { safe } from "@/lib/server/safe";
import { STATES } from "@/lib/states";

export const revalidate = 3600;

type Props = { params: Promise<{ kategorie: string }> };

export async function generateStaticParams() {
  return [];
}

function resolve(slug: string): Exclude<Category, "milk"> | null {
  const c = categoryBySlug(slug);
  return c && c !== "milk" ? c : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = resolve((await params).kategorie);
  if (!c) return { title: "Nicht gefunden" };
  const page = CATEGORY_PAGE[c];
  return {
    title: `${page.title} – Direktverkauf in Deutschland`,
    description: `${page.intro} Alle Standorte auf einer Karte, nach Bundesland und Ort – mit Öffnungszeiten und Navigation.`,
    alternates: { canonical: `/${CATEGORY_SLUGS[c]}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const c = resolve((await params).kategorie);
  if (!c) notFound();
  const page = CATEGORY_PAGE[c];
  const [{ data: counts }, { data: cities }] = await Promise.all([
    safe(() => getStateCounts(c), []),
    safe(() => getTopCities(40, 2, c), []),
  ]);
  const total = counts.reduce((s, x) => s + x.total, 0);
  return (
    <FinderProvider initialFilters={{ categories: [c] }}>
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-sage-300 bg-white/70 px-3 py-1 text-xs font-medium text-forest-800">
          <CategoryIcon category={c} className="size-3.5" /> {CATEGORY_LABELS[c]}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-medium sm:text-5xl">{page.headline("Deutschland")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          {total.toLocaleString("de-DE")} Standorte erfasst. {page.intro}
        </p>
        <div className="mt-6 max-w-2xl"><SearchBox size="md" /></div>
        <ul className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STATES.map((s) => {
            const n = counts.find((x) => x.state === s.name)?.total ?? 0;
            return (
              <li key={s.slug}>
                <Link href={`/${CATEGORY_SLUGS[c]}/${s.slug}`} className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-sm hover:border-sage-400 hover:shadow-soft">
                  <span className="font-medium text-forest-900">{s.name}</span>
                  <span className="tabular-nums text-muted">{n}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-sm text-muted">Hinweis: {page.hint}</p>
      </section>
      <FinderSection title={`${page.title} auf der Karte`} />
      {cities.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-medium sm:text-3xl">Orte mit den meisten Standorten</h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {cities.map((x) => (
              <li key={x.slug} className="inline-flex rounded-full border border-line bg-white px-3 py-1.5 text-sm text-forest-900">
                {x.city} <span className="ml-1.5 text-muted">{x.total}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </FinderProvider>
  );
}
