import "server-only";
import { randomUUID } from "node:crypto";
import { pool, query } from "./db";
import { LOCATION_TYPES, type LocationType } from "./categories";
import { baseSlug, contentHash, diffFields, qualityScore, shortHash } from "./import/merge";
import { nearestPlace } from "./import/nearest-place";
import { recomputeLocation } from "./import/pipeline";
import type { NormalizedLocation } from "./import/types";
import { stateForPoint } from "./state-lookup";

export const EDITABLE_FIELDS = [
  "name", "address", "postal_code", "city", "latitude", "longitude", "location_type", "raw_milk_status",
  "description", "notes", "phone", "email", "website", "opening_hours", "is_24_7", "price_per_liter",
  "payment_methods", "organic_status", "organic_label", "image_url", "last_verified_at",
] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type LocationEdit = Partial<Record<EditableField, unknown>>;

const nullIfEmpty = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v);

/** Bereinigt Formulareingaben und wandelt sie in Spaltenwerte um. */
export function sanitizeEdit(input: Record<string, unknown>): LocationEdit {
  const out: LocationEdit = {};
  for (const f of EDITABLE_FIELDS) {
    if (!(f in input)) continue;
    let v = nullIfEmpty(input[f]);
    if (f === "latitude" || f === "longitude" || f === "price_per_liter") v = v == null ? null : Number(String(v).replace(",", "."));
    if ((f === "latitude" || f === "longitude") && (v == null || !Number.isFinite(v as number))) continue;
    if (f === "price_per_liter" && v != null && !Number.isFinite(v as number)) v = null;
    if (f === "is_24_7") v = v === "true" ? true : v === "false" ? false : null;
    if (f === "payment_methods") v = v ? String(v).split(/[,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
    if (f === "location_type" && !LOCATION_TYPES.includes(v as LocationType)) continue;
    if (f === "raw_milk_status" && !["confirmed", "unconfirmed", "not_raw"].includes(String(v))) continue;
    if (f === "organic_status" && v != null && !["verified", "claimed"].includes(String(v))) v = null;
    if (f === "website" && v && !/^https?:\/\//i.test(String(v))) v = `https://${v}`;
    out[f] = v;
  }
  // 24/7 wird immer aus den Öffnungszeiten abgeleitet, damit beides konsistent bleibt
  if ("opening_hours" in out) {
    const h = out.opening_hours as string | null;
    out.is_24_7 = h ? /^24\/7$|^Mo-Su 00:00-24:00$/.test(h) : null;
  }
  return out;
}

async function refreshQuality(id: string) {
  const [r] = await query(
    `select name_is_generated, address, postal_code, city, opening_hours, phone, website, raw_milk_status,
            payment_methods, price_per_liter, image_url, last_verified_at, quality_flags from locations where id = $1`,
    [id],
  );
  if (!r) return;
  const flags = new Set<string>(r.quality_flags as string[]);
  if (r.address) flags.delete("no_address"); else flags.add("no_address");
  if (r.city) flags.delete("no_city"); else flags.add("no_city");
  if (r.opening_hours) flags.delete("no_opening_hours"); else flags.add("no_opening_hours");
  const score = qualityScore({
    name_is_generated: r.name_is_generated as boolean,
    address: r.address as string | null,
    postal_code: r.postal_code as string | null,
    city: r.city as string | null,
    opening_hours: r.opening_hours as string | null,
    phone: r.phone as string | null,
    website: r.website as string | null,
    raw_milk_status: r.raw_milk_status as "confirmed" | "unconfirmed" | "not_raw",
    payment_methods: r.payment_methods as string[],
    image_url: r.image_url as string | null,
    price_per_liter: r.price_per_liter == null ? null : Number(r.price_per_liter),
    last_verified_at: r.last_verified_at ? new Date(r.last_verified_at as string).toISOString() : null,
    quality_flags: [...flags],
  });
  await query("update locations set data_quality_score = $2, quality_flags = $3 where id = $1", [id, score, [...flags].sort()]);
}

/** Redaktionelle Änderung: geänderte Felder werden gesperrt (Import überschreibt sie nicht mehr). */
export async function updateLocationAsAdmin(id: string, edit: LocationEdit, changeSource = "admin") {
  const [current] = await query("select * from locations where id = $1", [id]);
  if (!current) throw new Error("Standort nicht gefunden");
  const diff = diffFields(current, edit as Record<string, unknown>);
  if (edit.name !== undefined && diff.name) diff.name_is_generated = { from: current.name_is_generated, to: false };
  const cols = Object.keys(diff);
  if (!cols.length) return { changed: 0 };
  const values = cols.map((c) => (c === "name_is_generated" ? false : (edit as Record<string, unknown>)[c]));
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const locked = [...new Set([...(current.locked_fields as string[]), ...cols.filter((c) => c !== "name_is_generated")])];
  // Bundesland bei Positionsänderung neu bestimmen
  if (diff.latitude || diff.longitude) {
    const lat = Number(edit.latitude ?? current.latitude);
    const lon = Number(edit.longitude ?? current.longitude);
    sets.push(`state = $${values.length + 2}`);
    values.push(stateForPoint(lat, lon));
  }
  sets.push(`locked_fields = $${values.length + 2}`, "last_verified_at = coalesce(last_verified_at, now())");
  values.push(locked);
  await query(`update locations set ${sets.join(", ")} where id = $1`, [id, ...values]);
  await query("insert into location_changes (location_id, change_source, diff) values ($1,$2,$3)", [id, changeSource, diff]);
  await refreshQuality(id);
  return { changed: cols.length };
}

export async function unlockFields(id: string) {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query("update locations set locked_fields = '{}' where id = $1", [id]);
    await client.query("insert into location_changes (location_id, change_source, diff) values ($1,'admin',$2)", [id, { locked_fields: { from: "…", to: [] } }]);
    await recomputeLocation(client, id, "admin:unlock", null);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function setActive(id: string, active: boolean, reason: string) {
  await query("update locations set is_active = $2 where id = $1", [id, active]);
  await query("insert into location_changes (location_id, change_source, diff) values ($1,'admin',$2)", [
    id, { is_active: { from: !active, to: active }, reason },
  ]);
}

export async function deleteLocation(id: string) {
  await query("delete from locations where id = $1", [id]);
}

/** Legt einen Standort redaktionell an (Quelle „manual“). */
export async function createManualLocation(edit: LocationEdit, changeSource = "admin"): Promise<{ id: string; slug: string }> {
  const lat = Number(edit.latitude);
  const lon = Number(edit.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Koordinaten fehlen");
  const state = stateForPoint(lat, lon);
  if (!state) throw new Error("Koordinaten liegen nicht in Deutschland");
  const type = (edit.location_type as LocationType) ?? "direct_sale";
  const name = (edit.name as string | null) ?? null;
  const n: NormalizedLocation = {
    source: "manual",
    sourceId: `manual:${randomUUID()}`,
    sourceUrl: null,
    name,
    address: (edit.address as string) ?? null,
    postalCode: (edit.postal_code as string) ?? null,
    city: (edit.city as string) ?? null,
    state,
    country: "DE",
    latitude: lat,
    longitude: lon,
    locationType: type,
    salesTypes: type === "raw_milk_vending" || type === "vending_machine" ? ["automat"] : type === "farm_shop" ? ["hofladen", "direktverkauf"] : ["direktverkauf"],
    rawMilkStatus: (edit.raw_milk_status as NormalizedLocation["rawMilkStatus"]) ?? "unconfirmed",
    products: ["milk"],
    description: (edit.description as string) ?? null,
    notes: (edit.notes as string) ?? null,
    phone: (edit.phone as string) ?? null,
    email: (edit.email as string) ?? null,
    website: (edit.website as string) ?? null,
    openingHours: (edit.opening_hours as string) ?? null,
    is247: (edit.is_24_7 as boolean | null) ?? null,
    pricePerLiter: (edit.price_per_liter as number | null) ?? null,
    paymentMethods: (edit.payment_methods as string[]) ?? [],
    organicStatus: (edit.organic_status as "verified" | "claimed" | null) ?? null,
    organicLabel: (edit.organic_label as string) ?? null,
    imageUrl: (edit.image_url as string) ?? null,
    lastVerifiedAt: new Date().toISOString().slice(0, 10),
    qualityFlags: [],
    operator: null,
    nearbyPlace: name ? null : nearestPlace(lat, lon),
  };
  const client = await pool().connect();
  try {
    await client.query("begin");
    const tmpSlug = `tmp-${shortHash(n.sourceId)}`;
    const { rows } = await client.query<{ id: string }>(
      `insert into locations (name, slug, latitude, longitude, location_type, source, state) values ($1,$2,$3,$4,$5,'manual',$6) returning id`,
      [name ?? "Neuer Standort", tmpSlug, lat, lon, type, state],
    );
    const id = rows[0].id;
    await client.query(
      `insert into location_sources (location_id, source, source_id, normalized, raw, content_hash) values ($1,'manual',$2,$3,$4,$5)`,
      [id, n.sourceId, n, { createdBy: changeSource }, contentHash(n)],
    );
    await recomputeLocation(client, id, changeSource, null);
    const { rows: [loc] } = await client.query<{ name: string; city: string | null }>("select name, city from locations where id = $1", [id]);
    let slug = baseSlug(loc.name, loc.city);
    const { rows: taken } = await client.query("select 1 from locations where slug = $1", [slug]);
    if (taken.length) slug = `${slug}-${shortHash(n.sourceId)}`;
    await client.query("update locations set slug = $2 where id = $1", [id, slug]);
    await client.query("commit");
    return { id, slug };
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function adminStats() {
  const [s] = await query<Record<string, number>>(`select
      count(*) filter (where is_active)::int as active,
      count(*) filter (where not is_active)::int as inactive,
      count(*) filter (where is_active and raw_milk_status = 'confirmed')::int as raw_confirmed,
      count(*) filter (where is_active and data_quality_score < 40)::int as low_quality,
      count(*) filter (where is_active and 'no_address' = any(quality_flags))::int as no_address,
      count(*) filter (where is_active and 'no_opening_hours' = any(quality_flags))::int as no_hours,
      count(*) filter (where is_active and 'osm_fixme' = any(quality_flags))::int as fixme,
      count(*) filter (where is_active and 'possibly_disused' = any(quality_flags))::int as disused,
      count(*) filter (where is_active and name_is_generated)::int as no_name,
      count(*) filter (where is_active and 'multi_source' = any(quality_flags))::int as multi_source,
      round(avg(data_quality_score) filter (where is_active))::int as avg_quality,
      (select count(*) from submissions where status = 'pending')::int as pending_submissions,
      (select count(*) from duplicate_candidates where status = 'open')::int as open_duplicates
    from locations`);
  const byType = await query<{ location_type: string; n: number }>(
    "select location_type, count(*)::int n from locations where is_active group by 1 order by 2 desc",
  );
  const byState = await query<{ state: string; n: number }>(
    "select coalesce(state,'?') state, count(*)::int n from locations where is_active group by 1 order by 2 desc",
  );
  const runs = await query<{ id: number; source: string; mode: string; started_at: Date; finished_at: Date | null; status: string; stats: Record<string, unknown> }>(
    "select id, source, mode, started_at, finished_at, status, stats from import_runs order by id desc limit 5",
  );
  return { s, byType, byState, runs };
}
