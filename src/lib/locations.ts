import "server-only";
import { query } from "./db";
import { CATEGORIES, type Category } from "./categories";
import type { LocationDetail, MapPoint, PlaceResult, Stats } from "./types";

const POINT_COLUMNS = `
  id, slug, name, name_is_generated as gen, location_type as type, latitude as lat, longitude as lon,
  address as addr, postal_code as pc, city, state, opening_hours as oh, is_24_7 as h24,
  raw_milk_status as raw, categories as cat, organic_status as org, payment_methods as pay, sales_types as sales,
  price_per_liter::float as price, data_quality_score as q`;

export async function getMapPoints(): Promise<MapPoint[]> {
  return query<MapPoint>(`select ${POINT_COLUMNS} from locations where is_active order by name`);
}

export async function getPointsWhere(where: string, params: unknown[], limit = 500): Promise<MapPoint[]> {
  return query<MapPoint>(
    `select ${POINT_COLUMNS} from locations where is_active and (${where}) order by name limit ${Number(limit)}`,
    params,
  );
}

export async function getNearby(lat: number, lon: number, radiusKm: number, limit = 12, excludeId?: string, category?: Category) {
  return query<MapPoint & { distance: number }>(
    `select ${POINT_COLUMNS},
            st_distance(geom, st_setsrid(st_makepoint($2,$1),4326)::geography) as distance
       from locations
      where is_active and st_dwithin(geom, st_setsrid(st_makepoint($2,$1),4326)::geography, $3)
        and ($5::uuid is null or id <> $5::uuid)
        and ($6::text is null or $6::text = any(categories))
      order by distance limit $4`,
    [lat, lon, radiusKm * 1000, limit, excludeId ?? null, category ?? null],
  );
}

export async function getStats(): Promise<Stats> {
  const [r] = await query<{
    vending: number; total: number; farms: number; states: number; raw_confirmed: number; last_import: string | null;
    by_category: Record<string, number>;
  }>(`select
      count(*) filter (where location_type in ('raw_milk_vending','vending_machine') and 'milk' = any(categories))::int as vending,
      count(*)::int as total,
      count(*) filter (where location_type in ('farm_shop','farm'))::int as farms,
      (select coalesce(json_object_agg(c, n), '{}') from (select c, count(*)::int n from locations, unnest(categories) c
         where is_active group by c) x) as by_category,
      count(distinct state)::int as states,
      count(*) filter (where raw_milk_status = 'confirmed')::int as raw_confirmed,
      (select max(finished_at) from import_runs where status = 'success')::text as last_import
    from locations where is_active`);
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, r.by_category?.[c] ?? 0])) as Record<Category, number>;
  return {
    byCategory,
    vending: r.vending,
    total: r.total,
    farms: r.farms,
    states: r.states,
    rawConfirmed: r.raw_confirmed,
    lastImport: r.last_import,
  };
}

export async function getStateCounts(category: Category = "milk"): Promise<{ state: string; total: number; vending: number }[]> {
  return query(
    `select state, count(*)::int as total,
            count(*) filter (where location_type in ('raw_milk_vending','vending_machine'))::int as vending
       from locations where is_active and state is not null and $1 = any(categories) group by state order by state`,
    [category],
  );
}

type DetailRow = Record<string, unknown>;

function toDetail(r: DetailRow, sources: LocationDetail["sources"]): LocationDetail {
  const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string | null));
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    nameIsGenerated: r.name_is_generated as boolean,
    address: r.address as string | null,
    postalCode: r.postal_code as string | null,
    city: r.city as string | null,
    state: r.state as string | null,
    country: r.country as string,
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    locationType: r.location_type as LocationDetail["locationType"],
    salesTypes: r.sales_types as string[],
    rawMilkStatus: r.raw_milk_status as LocationDetail["rawMilkStatus"],
    categories: (r.categories as Category[]) ?? ["milk"],
    products: r.products as string[],
    description: r.description as string | null,
    notes: r.notes as string | null,
    phone: r.phone as string | null,
    email: r.email as string | null,
    website: r.website as string | null,
    openingHours: r.opening_hours as string | null,
    is247: r.is_24_7 as boolean | null,
    pricePerLiter: r.price_per_liter == null ? null : Number(r.price_per_liter),
    paymentMethods: r.payment_methods as string[],
    organicStatus: r.organic_status as LocationDetail["organicStatus"],
    organicLabel: r.organic_label as string | null,
    imageUrl: r.image_url as string | null,
    source: r.source as string,
    sourceUrl: r.source_url as string | null,
    lastVerifiedAt: iso(r.last_verified_at),
    lastImportedAt: iso(r.last_imported_at),
    updatedAt: iso(r.updated_at) as string,
    dataQualityScore: r.data_quality_score as number,
    qualityFlags: r.quality_flags as string[],
    isActive: r.is_active as boolean,
    sources,
  };
}

async function loadSources(locationId: string): Promise<LocationDetail["sources"]> {
  const rows = await query<{
    source: string; name: string; source_id: string; source_url: string | null; license: string | null;
    attribution: string | null; last_seen_at: Date; is_stale: boolean;
  }>(
    `select s.source, d.name, s.source_id, s.source_url, d.license, d.attribution, s.last_seen_at, s.is_stale
       from location_sources s join data_sources d on d.key = s.source
      where s.location_id = $1 order by d.priority, s.source_id`,
    [locationId],
  );
  return rows.map((s) => ({
    source: s.source,
    sourceName: s.name,
    sourceId: s.source_id,
    sourceUrl: s.source_url,
    license: s.license,
    attribution: s.attribution,
    lastSeenAt: s.last_seen_at.toISOString(),
    isStale: s.is_stale,
  }));
}

export async function getLocationBySlug(slug: string): Promise<LocationDetail | null> {
  const [r] = await query("select * from locations where slug = $1", [slug]);
  if (!r) return null;
  return toDetail(r, await loadSources(r.id as string));
}

export async function getLocationById(id: string): Promise<LocationDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await query("select * from locations where id = $1", [id]);
  if (!r) return null;
  return toDetail(r, await loadSources(r.id as string));
}

export async function getAllSlugs(): Promise<{ slug: string; updated_at: Date }[]> {
  return query("select slug, updated_at from locations where is_active order by slug");
}

export async function getPlaceBySlug(kind: "city" | "state", slug: string) {
  const [p] = await query<{ name: string; slug: string; state: string | null; latitude: number; longitude: number; bbox: number[] | null }>(
    "select name, slug, state, latitude, longitude, bbox from places where kind = $1 and slug = $2",
    [kind, slug],
  );
  return p ?? null;
}

/** Städte mit den meisten Standorten (für SEO-Landingpages und Sitemap). */
export async function getTopCities(limit = 60, minCount = 1, category: Category = "milk") {
  return query<{ city: string; slug: string; state: string | null; total: number }>(
    `select l.city, p.slug, mode() within group (order by l.state) as state, count(*)::int as total
       from locations l join places p on p.kind = 'city' and lower(p.name) = lower(l.city)
      where l.is_active and l.city is not null and $3 = any(l.categories)
      group by l.city, p.slug having count(*) >= $2
      order by total desc, l.city limit $1`,
    [limit, minCount, category],
  );
}

export async function searchPlaces(q: string, limit = 6): Promise<PlaceResult[]> {
  const term = q.trim();
  if (!term) return [];
  const isPlz = /^\d{2,5}$/.test(term);
  const rows = await query<{ kind: PlaceResult["kind"]; name: string; slug: string; state: string | null; latitude: number; longitude: number; bbox: number[] | null; source: string; sim: number }>(
    isPlz
      ? `select kind, name, slug, state, latitude, longitude, bbox, source, 1 as sim from places
          where kind = 'postal_code' and name like $1 || '%' order by name limit $2`
      : `select kind, name, slug, state, latitude, longitude, bbox, source,
                greatest(similarity(name, $1), case when lower(name) like lower($1) || '%' then 0.9 else 0 end) as sim
           from places
          where kind <> 'postal_code' and (lower(name) like lower($1) || '%' or similarity(name, $1) > 0.4)
          order by (kind = 'state') desc, sim desc, length(name) limit $2`,
    [term, limit],
  );
  return rows.map((r) => ({
    kind: r.kind,
    label: r.kind === "postal_code" ? `${r.name}${r.state ? ` (${r.state})` : ""}` : r.kind === "state" ? r.name : `${r.name}${r.state ? `, ${r.state}` : ""}`,
    slug: r.slug,
    lat: r.latitude,
    lon: r.longitude,
    bbox: (r.bbox as [number, number, number, number] | null) ?? null,
    source: r.source,
  }));
}
