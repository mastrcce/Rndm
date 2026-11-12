import { BadgeCheck, Database, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FinderProvider } from "@/components/finder/finder-context";
import { FinderSection } from "@/components/finder/finder-section";
import { SearchBox } from "@/components/finder/search-box";
import { InstallButton } from "@/components/pwa/install-button";
import { SafetyNotice } from "@/components/safety-notice";
import { StatsGrid } from "@/components/stats";
import { getStateCounts, getStats } from "@/lib/locations";
import { EMPTY_STATS, safe } from "@/lib/server/safe";
import { STATES } from "@/lib/states";
import { formatDate, siteUrl } from "@/lib/utils";

export const revalidate = 600;

export default async function HomePage() {
  const [{ data: stats, ok }, { data: states }] = await Promise.all([
    safe(getStats, EMPTY_STATS),
    safe(getStateCounts, []),
  ]);
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--color-sage-200),transparent_60%),radial-gradient(ellipse_at_bottom_left,var(--color-cream-200),transparent_55%)]" />
        <svg className="absolute -right-24 bottom-0 -z-10 hidden h-72 w-[46rem] text-sage-300/50 md:block" viewBox="0 0 700 260" fill="none" aria-hidden>
          <path d="M0 220c90-40 170-60 260-50s170 40 260 20 120-60 180-60v130H0z" fill="currentColor" />
          <path d="M0 250c120-30 220-40 330-30s200 20 370-10v50H0z" fill="currentColor" opacity=".6" />
        </svg>
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-sage-300 bg-white/70 px-3 py-1 text-xs font-medium text-forest-800">
            <span className="size-1.5 rounded-full bg-sage-500" /> Direkt vom Hof · ganz Deutschland
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Finde frische Rohmilch in deiner Nähe.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
            Entdecke Rohmilchautomaten, Bauernhöfe und regionale Verkaufsstellen in ganz Deutschland.
          </p>
          <div className="mt-8 max-w-3xl">
            <SearchBox />
          </div>
          <div className="mt-10">
            <StatsGrid stats={stats} />
            {!ok && (
              <p className="mt-3 text-sm text-warn-fg">Die Datenbank ist derzeit nicht erreichbar. Bitte später erneut versuchen.</p>
            )}
            {stats.lastImport && (
              <p className="mt-3 text-xs text-muted">
                Letzter Datenabgleich: {formatDate(stats.lastImport)} · {stats.rawConfirmed.toLocaleString("de-DE")} Standorte mit ausdrücklich bestätigter Rohmilch ·{" "}
                <Link href="/datenquellen" className="underline underline-offset-2">Quellen</Link>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SafetyNotice className="mb-10" />
      </div>

      <FinderSection />

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
              <h3 className="mt-3 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* App */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl2 bg-forest-900 p-8 text-cream-50 shadow-lift sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-semibold text-cream-50 sm:text-3xl">Rohmilch-Atlas als App</h2>
            <p className="mt-2 max-w-xl text-cream-200/90">
              Auf den Startbildschirm legen – kostenlos, ohne App Store. Mit Favoriten und Karte auch offline.
            </p>
          </div>
          <InstallButton variant="secondary" className="shrink-0" />
        </div>
      </section>

      {/* Bundesländer */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">Rohmilch nach Bundesland</h2>
        <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STATES.map((s) => {
            const c = states.find((x) => x.state === s.name);
            return (
              <li key={s.slug}>
                <Link href={`/rohmilchautomaten/${s.slug}`} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm hover:border-sage-400 hover:shadow-soft">
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
