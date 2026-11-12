import type { PoolClient } from "pg";
import { pool } from "../db";
import {
  AUTO_MERGE_SCORE,
  MATCH_RADIUS_M,
  REVIEW_SCORE,
  baseSlug,
  contentHash,
  diffFields,
  matchScore,
  mergeSources,
  shortHash,
  type CanonicalFields,
  type RankedSource,
} from "./merge";
import type { AdapterResult, ImportLogger, NormalizedLocation } from "./types";

export type ImportStats = {
  scanned: number;
  accepted: number;
  created: number;
  updated: number;
  unchanged: number;
  attachedToExisting: number;
  reviewCandidates: number;
  stale: number;
  deactivated: number;
  skipped: Record<string, number>;
};

const CANONICAL_COLUMNS: (keyof CanonicalFields)[] = [
  "name", "name_is_generated", "address", "postal_code", "city", "state", "country", "latitude", "longitude",
  "location_type", "sales_types", "raw_milk_status", "categories", "products", "description", "notes", "phone", "email",
  "website", "opening_hours", "is_24_7", "price_per_liter", "payment_methods", "organic_status",
  "organic_label", "image_url", "source", "source_url", "last_verified_at", "data_quality_score", "quality_flags",
];

async function uniqueSlug(client: PoolClient, name: string, city: string | null, sourceId: string): Promise<string> {
  const base = baseSlug(name, city);
  const { rows } = await client.query<{ slug: string }>("select slug from locations where slug = $1 or slug like $2", [base, `${base}-%`]);
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  const withHash = `${base}-${shortHash(sourceId)}`;
  if (!taken.has(withHash)) return withHash;
  let i = 2;
  while (taken.has(`${withHash}-${i}`)) i++;
  return `${withHash}-${i}`;
}

async function sourcePriorities(client: PoolClient): Promise<Map<string, number>> {
  const { rows } = await client.query<{ key: string; priority: number }>("select key, priority from data_sources");
  return new Map(rows.map((r) => [r.key, r.priority]));
}

/** Baut den kanonischen Datensatz eines Standorts aus seinen aktiven Quellen neu auf. */
export async function recomputeLocation(
  client: PoolClient,
  locationId: string,
  changeSource: string,
  runId: number | null,
  priorities?: Map<string, number>,
): Promise<"updated" | "unchanged" | "deactivated"> {
  const prio = priorities ?? (await sourcePriorities(client));
  const { rows: srcRows } = await client.query<{ source: string; normalized: NormalizedLocation }>(
    "select source, normalized from location_sources where location_id = $1 and not is_stale",
    [locationId],
  );
  const { rows: locRows } = await client.query("select * from locations where id = $1", [locationId]);
  const current = locRows[0];
  if (!current) return "unchanged";

  if (srcRows.length === 0) {
    if (!current.is_active) return "unchanged";
    await client.query("update locations set is_active = false where id = $1", [locationId]);
    await client.query(
      "insert into location_changes (location_id, change_source, import_run_id, diff) values ($1,$2,$3,$4)",
      [locationId, changeSource, runId, { is_active: { from: true, to: false }, reason: "in keiner Quelle mehr enthalten" }],
    );
    return "deactivated";
  }

  const ranked: RankedSource[] = srcRows.map((r) => ({ normalized: r.normalized, priority: prio.get(r.source) ?? 50 }));
  const merged = mergeSources(ranked) as Record<string, unknown>;
  const locked: string[] = current.locked_fields ?? [];
  for (const f of locked) delete merged[f];

  const diff = diffFields(current, merged);
  const reactivate = !current.is_active;
  if (Object.keys(diff).length === 0 && !reactivate) {
    await client.query("update locations set last_imported_at = now() where id = $1", [locationId]);
    return "unchanged";
  }

  const cols = Object.keys(diff);
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const values = cols.map((c) => merged[c]);
  sets.push("last_imported_at = now()", "is_active = true");
  await client.query(`update locations set ${sets.join(", ")} where id = $1`, [locationId, ...values]);
  if (reactivate) diff.is_active = { from: false, to: true };
  await client.query(
    "insert into location_changes (location_id, change_source, import_run_id, diff) values ($1,$2,$3,$4)",
    [locationId, changeSource, runId, diff],
  );
  return "updated";
}

async function insertLocation(client: PoolClient, n: NormalizedLocation, priority: number, runId: number): Promise<string> {
  const c = mergeSources([{ normalized: n, priority }]);
  const slug = await uniqueSlug(client, c.name, c.city, `${n.source}:${n.sourceId}`);
  const cols = [...CANONICAL_COLUMNS, "slug", "last_imported_at"];
  const values = [...CANONICAL_COLUMNS.map((k) => c[k]), slug, new Date()];
  const placeholders = values.map((_, i) => `$${i + 1}`);
  const { rows } = await client.query<{ id: string }>(
    `insert into locations (${cols.join(", ")}) values (${placeholders.join(", ")}) returning id`,
    values,
  );
  await client.query(
    "insert into location_changes (location_id, change_source, import_run_id, diff) values ($1,$2,$3,$4)",
    [rows[0].id, `import:${n.source}`, runId, { created: { from: null, to: c.name } }],
  );
  return rows[0].id;
}

type NearbyRow = {
  id: string;
  name: string;
  name_is_generated: boolean;
  address: string | null;
  postal_code: string | null;
  latitude: number;
  longitude: number;
  location_type: CanonicalFields["location_type"];
};

async function findMatches(client: PoolClient, n: NormalizedLocation, excludeSource: string) {
  // Nur Standorte berücksichtigen, die noch keinen Datensatz derselben Quelle mit anderer ID haben,
  // es sei denn, die Übereinstimmung ist sehr eindeutig (Doppel-Erfassung in derselben Quelle).
  const { rows } = await client.query<NearbyRow & { has_same_source: boolean }>(
    `select l.id, l.name, l.name_is_generated, l.address, l.postal_code, l.latitude, l.longitude, l.location_type,
            exists(select 1 from location_sources s where s.location_id = l.id and s.source = $4) as has_same_source
       from locations l
      where st_dwithin(l.geom, st_setsrid(st_makepoint($1, $2), 4326)::geography, $3)`,
    [n.longitude, n.latitude, MATCH_RADIUS_M, excludeSource],
  );
  return rows
    .map((r) => {
      const m = matchScore(
        { name: n.name, address: n.address, postalCode: n.postalCode, latitude: n.latitude, longitude: n.longitude, locationType: n.locationType },
        { name: r.name, nameIsGenerated: r.name_is_generated, address: r.address, postalCode: r.postal_code, latitude: r.latitude, longitude: r.longitude, locationType: r.location_type },
      );
      // Innerhalb derselben Quelle nur bei sehr hoher Sicherheit automatisch zusammenführen.
      const auto = r.has_same_source ? m.score >= 0.9 : m.score >= AUTO_MERGE_SCORE;
      return { row: r, ...m, auto };
    })
    .filter((m) => m.score >= REVIEW_SCORE)
    .sort((a, b) => b.score - a.score);
}

async function addCandidate(client: PoolClient, a: string, b: string, score: number, distance: number, reasons: string[]) {
  const [x, y] = a < b ? [a, b] : [b, a];
  await client.query(
    `insert into duplicate_candidates (location_a, location_b, score, distance_m, reasons)
     values ($1,$2,$3,$4,$5) on conflict (location_a, location_b) do nothing`,
    [x, y, score, distance, reasons],
  );
}

export async function startRun(source: string, mode: string): Promise<number> {
  const { rows } = await pool().query<{ id: string }>(
    "insert into import_runs (source, mode) values ($1, $2) returning id",
    [source, mode],
  );
  return Number(rows[0].id);
}

export async function appendRunLog(runId: number, lines: string[]) {
  if (!lines.length) return;
  await pool().query("update import_runs set log = log || $2 where id = $1", [runId, lines.join("\n") + "\n"]);
}

export async function finishRun(runId: number, status: "success" | "failed", stats: unknown) {
  await pool().query("update import_runs set finished_at = now(), status = $2, stats = $3 where id = $1", [runId, status, stats]);
}

/**
 * Führt einen Import durch: neue Datensätze anlegen oder vorhandenen Standorten zuordnen,
 * geänderte Quellen aktualisieren, verschwundene Quellen als veraltet markieren.
 */
export async function runImport(
  sourceKey: string,
  result: AdapterResult,
  log: ImportLogger,
  existingRunId?: number,
): Promise<{ runId: number; stats: ImportStats }> {
  const runId = existingRunId ?? (await startRun(sourceKey, result.mode));
  const client = await pool().connect();
  const stats: ImportStats = {
    scanned: result.scanned,
    accepted: result.records.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    attachedToExisting: 0,
    reviewCandidates: 0,
    stale: 0,
    deactivated: 0,
    skipped: result.skipped,
  };
  try {
    const prio = await sourcePriorities(client);
    if (!prio.has(sourceKey)) throw new Error(`Unbekannte Datenquelle "${sourceKey}" (Tabelle data_sources).`);
    const priority = prio.get(sourceKey)!;

    const { rows: existing } = await client.query<{ id: string; source_id: string; location_id: string; content_hash: string; is_stale: boolean }>(
      "select id, source_id, location_id, content_hash, is_stale from location_sources where source = $1",
      [sourceKey],
    );
    const bySourceId = new Map(existing.map((e) => [e.source_id, e]));
    const seen = new Set<string>();
    let i = 0;

    for (const rec of result.records) {
      const n = rec.normalized;
      seen.add(n.sourceId);
      const hash = contentHash(n);
      const prev = bySourceId.get(n.sourceId);
      await client.query("begin");
      try {
        if (prev) {
          if (prev.content_hash === hash && !prev.is_stale) {
            await client.query("update location_sources set last_seen_at = now() where id = $1", [prev.id]);
            stats.unchanged++;
          } else {
            await client.query(
              `update location_sources set normalized = $2, raw = $3, content_hash = $4, source_url = $5,
                      last_seen_at = now(), is_stale = false where id = $1`,
              [prev.id, n, rec.raw, hash, n.sourceUrl],
            );
            const r = await recomputeLocation(client, prev.location_id, `import:${sourceKey}`, runId, prio);
            if (r === "updated") stats.updated++;
            else stats.unchanged++;
          }
        } else {
          const matches = await findMatches(client, n, sourceKey);
          const best = matches[0];
          let locationId: string;
          if (best?.auto) {
            locationId = best.row.id;
            stats.attachedToExisting++;
          } else {
            locationId = await insertLocation(client, n, priority, runId);
            stats.created++;
            for (const m of matches.slice(0, 3)) {
              await addCandidate(client, locationId, m.row.id, m.score, m.distance, m.reasons);
              stats.reviewCandidates++;
            }
          }
          await client.query(
            `insert into location_sources (location_id, source, source_id, source_url, normalized, raw, content_hash)
             values ($1,$2,$3,$4,$5,$6,$7)`,
            [locationId, sourceKey, n.sourceId, n.sourceUrl, n, rec.raw, hash],
          );
          if (best?.auto) await recomputeLocation(client, locationId, `merge:${sourceKey}`, runId, prio);
        }
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        log(`Fehler bei ${n.sourceId}: ${(err as Error).message}`);
      }
      if (++i % 250 === 0) log(`… ${i}/${result.records.length} verarbeitet`);
    }

    // Veraltete Quelldatensätze (nur bei vollständigen Abzügen)
    if (result.complete) {
      const minExpected = Math.floor(existing.filter((e) => !e.is_stale).length * 0.6);
      if (result.records.length < minExpected) {
        log(`Warnung: nur ${result.records.length} Datensätze statt erwartet ≥ ${minExpected}. ` +
          "Veraltete Einträge werden zur Sicherheit NICHT deaktiviert.");
      } else {
        const gone = existing.filter((e) => !seen.has(e.source_id) && !e.is_stale);
        for (const g of gone) {
          await client.query("begin");
          await client.query("update location_sources set is_stale = true where id = $1", [g.id]);
          const r = await recomputeLocation(client, g.location_id, `import:${sourceKey}`, runId, prio);
          await client.query("commit");
          stats.stale++;
          if (r === "deactivated") stats.deactivated++;
        }
      }
    }

    await client.query("update data_sources set last_run_at = now() where key = $1", [sourceKey]);
    log(
      `Fertig: ${stats.created} neu, ${stats.updated} aktualisiert, ${stats.unchanged} unverändert, ` +
        `${stats.attachedToExisting} vorhandenen Standorten zugeordnet, ${stats.reviewCandidates} Dublettenkandidaten, ` +
        `${stats.stale} veraltet, ${stats.deactivated} deaktiviert.`,
    );
    return { runId, stats };
  } finally {
    client.release();
  }
}

/** Führt zwei Standorte zusammen (Admin-Aktion bei Dublettenprüfung). `keepId` bleibt bestehen. */
export async function mergeLocations(keepId: string, removeId: string, actor: string) {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query("update location_sources set location_id = $1 where location_id = $2", [keepId, removeId]);
    await client.query("update submissions set location_id = $1 where location_id = $2", [keepId, removeId]);
    await client.query(
      "insert into location_changes (location_id, change_source, diff) values ($1,$2,$3)",
      [keepId, actor, { merged_from: { from: null, to: removeId } }],
    );
    await client.query(
      `update duplicate_candidates set status = 'merged', resolved_at = now()
        where (location_a = $1 and location_b = $2) or (location_a = $2 and location_b = $1)`,
      [keepId, removeId],
    );
    await client.query("delete from locations where id = $1", [removeId]);
    await recomputeLocation(client, keepId, actor, null);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
