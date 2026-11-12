import { BadgeCheck, Database, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FinderProvider } from "@/components/finder/finder-context";
import { FinderSection } from "@/components/finder/finder-section";
import { SearchBox } from "@/components/finder/search-box";
import { InstallButton } from "@/components/pwa/install-button";
import { CategoryCards } from "@/components/category-cards";
import { getStateCounts } from "@/lib/locations";
import { safe } from "@/lib/server/safe";
import { STATES } from "@/lib/states";
import { siteUrl } from "@/lib/utils";

export const revalidate = 600;

export default async function HomePage() {
  const { data: states, ok } = await safe(getStateCounts, []);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Rohmilch-Atlas",
    url: siteUrl("/"),
    inLanguage: "de-DE",
    description: "Verzeichnis von Rohmilchautomaten, Hofläden und Verkaufsstellen in Deutschland.",
  };

  return (
    <FinderProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Hero */}
      <section className="bg-sage-100">
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-12 text-center sm:px-6 sm:pb-14 sm:pt-16">
          <h1 className="text-[1.75rem] font-medium leading-[1.1] sm:text-6xl sm:leading-[1.05]">
            Finde frische Rohmilch in deiner Nähe.
          </h1>
          <div className="mt-8 sm:mt-10">
            <SearchBox align="center" />
          </div>
          {!ok && (
            <p className="mt-6 text-sm text-warn-fg">Die Datenbank ist derzeit nicht erreichbar. Bitte später erneut versuchen.</p>
          )}
        </div>
      </section>

      <FinderSection className="pt-8 sm:pt-10" />

      {/* Produkte */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-medium sm:text-3xl">Mehr vom Hof</h2>
        <p className="mt-2 max-w-2xl text-muted">Nicht nur Milch: Finde Eier, Honig, Fleisch und Käse direkt beim Erzeuger.</p>
        <div className="mt-6"><CategoryCards /></div>
      </section>

      {/* Vertrauen & Transparenz */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Database, title: "Offene Daten", text: "Die Standorte stammen aus OpenStreetMap – derselben Datenbasis wie farmshops.eu – und werden regelmäßig abgeglichen. Jede Detailseite nennt ihre Quelle." },
            { icon: BadgeCheck, title: "Ehrlich gekennzeichnet", text: "Wir unterscheiden zwischen ausdrücklich bestätigter Rohmilch und allgemeinem Milchverkauf. Fehlende Angaben erfinden wir nicht, sondern zeigen „Keine Angabe“." },
            { icon: ShieldCheck, title: "Gemeinsam aktuell", text: "Du kennst einen Automaten, der fehlt, oder eine Angabe stimmt nicht? Melde es uns – jeder Beitrag wird vor der Veröffentlichung geprüft." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl2 border border-line bg-white p-6 shadow-soft">
              <Icon className="size-6 text-sage-600" aria-hidden />
              <h3 className="mt-3 text-xl font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* App */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl2 bg-forest-900 p-8 text-cream-50 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-medium text-cream-50 sm:text-3xl">Rohmilch-Atlas als App</h2>
            <p className="mt-2 max-w-xl text-cream-200/90">
              Auf den Startbildschirm legen – kostenlos, ohne App Store. Mit Favoriten und Karte auch offline.
            </p>
          </div>
          <InstallButton variant="secondary" className="shrink-0" />
        </div>
      </section>

      {/* Bundesländer */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-medium sm:text-3xl">Rohmilch nach Bundesland</h2>
        <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STATES.map((s) => {
            const c = states.find((x) => x.state === s.name);
            return (
              <li key={s.slug}>
                <Link href={`/rohmilchautomaten/${s.slug}`} className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-sm hover:border-sage-400 hover:shadow-soft">
                  <span className="font-medium text-forest-900">{s.name}</span>
                  <span className="tabular-nums text-muted">{c?.total ?? 0}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </FinderProvider>
  );
}
