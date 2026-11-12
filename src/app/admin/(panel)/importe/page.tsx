import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { query } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { startOsmImport, toggleSource, uploadImportFile } from "../../actions";

export const metadata = { title: "Importe & Quellen" };

const ERRORS: Record<string, string> = { datei: "Bitte eine Datei auswählen.", groesse: "Datei zu groß (max. 10 MB).", quelle: "Quelle unbekannt oder deaktiviert." };

export default async function ImportsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const sources = await query<{ key: string; name: string; url: string | null; license: string | null; enabled: boolean; notes: string | null; last_run_at: Date | null; priority: number }>(
    "select key, name, url, license, enabled, notes, last_run_at, priority from data_sources order by priority",
  );
  const runs = await query<{ id: number; source: string; mode: string; started_at: Date; finished_at: Date | null; status: string; stats: Record<string, unknown>; log: string }>(
    "select id, source, mode, started_at, finished_at, status, stats, log from import_runs order by id desc limit 25",
  );
  const highlight = Number(sp.lauf);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-medium">Importe & Datenquellen</h1>
      {sp.fehler && <p className="rounded-2xl bg-warn-bg px-4 py-2 text-sm text-warn-fg">{ERRORS[sp.fehler] ?? sp.fehler}</p>}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-medium">OpenStreetMap-Import</h2>
          <p className="mt-1 text-sm text-muted">
            „Live“ fragt die Overpass-API ab (dauert 1–5 Minuten, benötigt Netzzugang zu overpass-api.de).
            „Mitgelieferter Abzug“ nutzt die Datei data/seed/osm-hofprodukte-de.json aus dem Repository.
          </p>
          <form action={startOsmImport} className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1">
              <Label htmlFor="mode">Modus</Label>
              <Select id="mode" name="mode" defaultValue="overpass">
                <option value="overpass">Live (Overpass-API)</option>
                <option value="seed">Mitgelieferter Abzug</option>
              </Select>
            </div>
            <Button type="submit">Import starten</Button>
          </form>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-medium">Datei-Import (CSV / JSON / GeoJSON)</h2>
          <p className="mt-1 text-sm text-muted">Format siehe docs/IMPORT-FORMAT.md. Pflicht: Koordinaten. Datei-Importe deaktivieren keine bestehenden Einträge.</p>
          <form action={uploadImportFile} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="file">Datei</Label>
              <input id="file" name="file" type="file" accept=".csv,.json,.geojson,text/csv,application/json" required className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-sage-100 file:px-3 file:py-2" />
            </div>
            <div>
              <Label htmlFor="source">Quelle</Label>
              <Select id="source" name="source" defaultValue="file">
                {sources.filter((s) => s.key !== "manual" && s.key !== "osm").map((s) => <option key={s.key} value={s.key} disabled={!s.enabled}>{s.name}</option>)}
              </Select>
            </div>
            <Button type="submit">Hochladen</Button>
          </form>
        </Card>
      </section>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-cream-50 text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-2">Quelle</th><th className="px-4 py-2">Lizenz</th><th className="px-4 py-2">Priorität</th><th className="px-4 py-2">Letzter Lauf</th><th className="px-4 py-2">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sources.map((s) => (
              <tr key={s.key}>
                <td className="px-4 py-2"><p className="font-medium">{s.name}</p><p className="text-xs text-muted">{s.notes}</p></td>
                <td className="px-4 py-2">{s.license ?? "–"}</td>
                <td className="px-4 py-2 tabular-nums">{s.priority}</td>
                <td className="px-4 py-2">{formatDate(s.last_run_at) ?? "–"}</td>
                <td className="px-4 py-2">
                  <form action={toggleSource.bind(null, s.key, !s.enabled)}>
                    <Button size="sm" variant={s.enabled ? "subtle" : "secondary"}>{s.enabled ? "aktiv" : "inaktiv"}</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <section>
        <h2 className="text-xl font-medium">Importprotokolle</h2>
        <ul className="mt-3 space-y-2">
          {runs.map((r) => (
            <li key={r.id}>
              <details open={Number(r.id) === highlight} className="rounded-xl2 border border-line bg-white">
                <summary className="flex cursor-pointer flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                  <span className="font-medium">#{r.id} · {r.source} · {r.mode}</span>
                  <span className={r.status === "failed" ? "text-red-700" : r.status === "running" ? "text-warn-fg" : "text-muted"}>
                    {r.status} · {formatDate(r.started_at)} {r.started_at.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin" })}
                    {r.finished_at ? ` · ${Math.round((r.finished_at.getTime() - r.started_at.getTime()) / 1000)} s` : ""}
                  </span>
                </summary>
                <div className="border-t border-line px-4 py-3">
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-cream-50 p-3 text-xs">{r.log || "(kein Protokoll)"}</pre>
                  <pre className="mt-2 overflow-auto rounded-2xl bg-cream-50 p-3 text-xs">{JSON.stringify(r.stats, null, 2)}</pre>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
