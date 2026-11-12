import type { Metadata } from "next";
import { Prose } from "@/components/prose";
import { query } from "@/lib/db";
import { safe } from "@/lib/server/safe";
import { formatDate } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Datenquellen & Lizenzen",
  description: "Woher die Standortdaten des Rohmilch-Atlas stammen, wie sie zusammengeführt werden und unter welcher Lizenz sie stehen.",
  alternates: { canonical: "/datenquellen" },
};

type SourceRow = { key: string; name: string; url: string | null; license: string | null; attribution: string | null; notes: string | null; last_run_at: Date | null; count: number };

export default async function SourcesPage() {
  const { data: sources } = await safe(
    () => query<SourceRow>(
      `select d.key, d.name, d.url, d.license, d.attribution, d.notes, d.last_run_at,
              (select count(distinct s.location_id) from location_sources s join locations l on l.id = s.location_id
                where s.source = d.key and not s.is_stale and l.is_active)::int as count
         from data_sources d order by d.priority`,
    ),
    [],
  );
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-medium sm:text-5xl">Datenquellen & Lizenzen</h1>
      <div className="mt-8 overflow-hidden rounded-xl2 border border-line bg-white shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream-50 text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3">Quelle</th><th className="px-4 py-3">Standorte</th><th className="px-4 py-3">Lizenz</th><th className="px-4 py-3">Letzter Abgleich</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sources.map((s) => (
              <tr key={s.key}>
                <td className="px-4 py-3 font-medium text-forest-900">{s.url ? <a href={s.url} className="underline" target="_blank" rel="noopener noreferrer">{s.name}</a> : s.name}</td>
                <td className="px-4 py-3 tabular-nums">{s.count}</td>
                <td className="px-4 py-3">{s.license ?? "–"}</td>
                <td className="px-4 py-3">{formatDate(s.last_run_at) ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Prose>
        <h2>OpenStreetMap (über farmshops.eu)</h2>
        <p>
          <a href="https://www.farmshops.eu" target="_blank" rel="noopener noreferrer">farmshops.eu</a> ist ein Open-Source-Projekt
          von Code for Karlsruhe, das Hofläden, Milchautomaten und andere Direktvermarkter aus{" "}
          <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> auf einer Karte zeigt.
          Wir verwenden dieselben offenen OSM-Daten – über den öffentlichen Datenexport des Projekts auf GitHub bzw. direkt über die
          Overpass-API – und filtern sie auf Standorte in Deutschland mit Milchbezug (z. B. <code>vending=milk</code>,{" "}
          <code>milk=raw_milk</code>, <code>drink:raw_milk</code>, Hofläden mit Milch im Sortiment).
        </p>
        <p>
          Die Daten stehen unter der <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer">Open Database License (ODbL) 1.0</a>.
          © OpenStreetMap-Mitwirkende. Die aus OSM abgeleitete Standortdatenbank dieses Projekts unterliegt ebenfalls der ODbL.
          Korrekturen am besten direkt in OpenStreetMap eintragen – sie erscheinen dann beim nächsten Abgleich auch hier.
        </p>
        <h2>Findhilde.de</h2>
        <p>
          <a href="https://findhilde.de" target="_blank" rel="noopener noreferrer">Findhilde.de</a> ist ein weiteres Verzeichnis für
          Milchautomaten. Ein offener Datenzugang (API oder Datenexport) ist uns nicht bekannt, und ohne Erlaubnis des Betreibers
          übernehmen wir keine Daten von dort. Sobald eine Genehmigung bzw. ein Export vorliegt, kann er über unsere
          Datei-Importschnittstelle eingespielt werden.
        </p>
        <h2>Zusammenführung & Dubletten</h2>
        <p>
          Kommt ein Betrieb in mehreren Quellen oder mehrfach in derselben Quelle vor, erkennen wir das anhand von Entfernung,
          Namensähnlichkeit, Adresse und Standortart. Eindeutige Fälle werden automatisch zusammengeführt, unsichere Fälle prüft
          die Redaktion. Jeder Standort erscheint so nur einmal auf der Karte; alle Ursprungsquellen bleiben auf der Detailseite sichtbar.
        </p>
        <h2>Bestätigte und unbestätigte Angaben</h2>
        <ul>
          <li><strong>Rohmilch laut Quelle bestätigt</strong>: Die Quelle nennt ausdrücklich Rohmilch (z. B. <code>milk=raw_milk</code> oder „Rohmilch“ im Namen/Beschreibung).</li>
          <li><strong>Rohmilch nicht ausdrücklich bestätigt</strong>: Es ist Milchverkauf angegeben, die Art der Milch aber nicht.</li>
          <li>Öffnungszeiten, „24/7“ und „jetzt geöffnet“ beruhen nur auf den hinterlegten Angaben und werden nicht vor Ort geprüft.</li>
          <li>Namen, die die Quelle nicht nennt, leiten wir aus Art und Lage ab (z. B. „Milchautomat bei …“) und kennzeichnen sie entsprechend.</li>
        </ul>
        <h2>Kartendarstellung</h2>
        <p>Kartenkacheln: © OpenStreetMap-Mitwirkende. Bundeslandgrenzen zur Zuordnung: <a href="https://github.com/isellsoap/deutschlandGeoJSON" target="_blank" rel="noopener noreferrer">deutschlandGeoJSON</a>.</p>
      </Prose>
    </article>
  );
}
