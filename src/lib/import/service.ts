import { pool } from "../db";
import { fetchOverpass, osmToRecords, readFarmshopsSnapshot, readSeed } from "./adapters/osm";
import { fileToRecords, parseFileContent } from "./adapters/file";
import { matchScore, REVIEW_SCORE, MATCH_RADIUS_M } from "./merge";
import { appendRunLog, finishRun, runImport, startRun } from "./pipeline";
import { rebuildPlaces } from "./places";
import type { AdapterResult } from "./types";

export type OsmMode = "overpass" | "snapshot" | "seed";

type RunOutput = { runId: number; ok: boolean; log: string[]; stats?: unknown; error?: string };

async function execute(source: string, mode: string, load: (log: (l: string) => void) => Promise<AdapterResult>, echo?: (l: string) => void): Promise<RunOutput> {
  const runId = await startRun(source, mode);
  const lines: string[] = [];
  let buffer: string[] = [];
  const log = (l: string) => {
    const line = `[${new Date().toISOString().slice(11, 19)}] ${l}`;
    lines.push(line);
    buffer.push(line);
    echo?.(line);
  };
  const flush = async () => {
    const b = buffer;
    buffer = [];
    await appendRunLog(runId, b);
  };
  try {
    log(`Import gestartet: Quelle=${source}, Modus=${mode}`);
    const result = await load(log);
    await flush();
    const { stats } = await runImport(source, result, log, runId);
    await rebuildPlaces(log);
    await flush();
    await finishRun(runId, "success", stats);
    return { runId, ok: true, log: lines, stats };
  } catch (e) {
    const msg = (e as Error).message;
    log(`FEHLER: ${msg}`);
    await flush();
    await finishRun(runId, "failed", { error: msg });
    return { runId, ok: false, log: lines, error: msg };
  }
}

export function importOsm(mode: OsmMode, opts: { dir?: string; echo?: (l: string) => void } = {}) {
  return execute("osm", mode, async (log) => {
    const elements =
      mode === "overpass" ? await fetchOverpass(log) :
      mode === "snapshot" ? readFarmshopsSnapshot(opts.dir ?? ".cache/farmshops.eu", log) :
      readSeed(log);
    return osmToRecords(elements, mode, log);
  }, opts.echo);
}

export function importFile(content: string, filename: string, sourceKey: string, echo?: (l: string) => void) {
  return execute(sourceKey, `file:${filename}`, async (log) => {
    const rows = parseFileContent(content, filename);
    return fileToRecords(rows, sourceKey, `file:${filename}`, log);
  }, echo);
}

/** Durchsucht den gesamten Bestand nach möglichen Dubletten (für die Admin-Prüfung). */
export async function scanDuplicates(): Promise<number> {
  const { rows } = await pool().query<{
    a: string; b: string; an: string; bn: string; ag: boolean; bg: boolean; aa: string | null; ba: string | null;
    ap: string | null; bp: string | null; alat: number; alon: number; blat: number; blon: number; at: never; bt: never;
  }>(
    `select a.id a, b.id b, a.name an, b.name bn, a.name_is_generated ag, b.name_is_generated bg, a.address aa, b.address ba,
            a.postal_code ap, b.postal_code bp, a.latitude alat, a.longitude alon, b.latitude blat, b.longitude blon,
            a.location_type at, b.location_type bt
       from locations a join locations b on a.id < b.id and st_dwithin(a.geom, b.geom, $1)
      where a.is_active and b.is_active`,
    [MATCH_RADIUS_M],
  );
  let added = 0;
  for (const r of rows) {
    const m = matchScore(
      { name: r.an, nameIsGenerated: r.ag, address: r.aa, postalCode: r.ap, latitude: r.alat, longitude: r.alon, locationType: r.at },
      { name: r.bn, nameIsGenerated: r.bg, address: r.ba, postalCode: r.bp, latitude: r.blat, longitude: r.blon, locationType: r.bt },
    );
    if (m.score < REVIEW_SCORE) continue;
    const res = await pool().query(
      `insert into duplicate_candidates (location_a, location_b, score, distance_m, reasons) values ($1,$2,$3,$4,$5)
       on conflict (location_a, location_b) do nothing`,
      [r.a, r.b, m.score, m.distance, m.reasons],
    );
    added += res.rowCount ?? 0;
  }
  return added;
}
