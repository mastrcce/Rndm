-- Rohmilch-Finder Deutschland – Grundschema
-- Kompatibel mit PostgreSQL >= 14 + PostGIS 3 (lokal und Supabase).

create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ---------------------------------------------------------------------------
-- Aufzählungen
-- ---------------------------------------------------------------------------
do $$ begin
  create type location_type as enum (
    'raw_milk_vending',  -- Rohmilchautomat / Milchtankstelle
    'vending_machine',   -- Verkaufsautomat, der (u. a.) Milch anbietet
    'farm_shop',         -- Hofladen
    'farm',              -- Bauernhof mit Direktverkauf ohne eigenen Laden
    'direct_sale'        -- sonstige Verkaufsstelle / Direktverkauf (Markt, Laden)
  );
exception when duplicate_object then null; end $$;

do $$ begin
  -- Ist Rohmilch ausdrücklich durch die Quelle belegt?
  create type raw_milk_status as enum ('confirmed', 'unconfirmed', 'not_raw');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_kind as enum ('report', 'suggestion', 'addition');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Datenquellen
-- ---------------------------------------------------------------------------
create table if not exists data_sources (
  key           text primary key,            -- z. B. 'osm', 'findhilde', 'manual'
  name          text not null,
  url           text,
  license       text,
  attribution   text,
  priority      int  not null default 50,     -- kleiner = höhere Priorität beim Zusammenführen
  enabled       boolean not null default true,
  notes         text,
  last_run_at   timestamptz,
  created_at    timestamptz not null default now()
);

insert into data_sources (key, name, url, license, attribution, priority, notes) values
  ('manual',    'Manuelle Pflege (Admin / moderierte Nutzerbeiträge)', null, null, null, 0,
   'Von der Redaktion geprüfte oder eingegebene Daten.'),
  ('findhilde', 'Findhilde.de', 'https://findhilde.de', 'Nur mit Erlaubnis des Betreibers', 'Daten: Findhilde.de', 20,
   'Kein offener Datenzugang bekannt. Import nur über Datei-Schnittstelle mit Genehmigung.'),
  ('osm',       'OpenStreetMap (via farmshops.eu / Overpass)', 'https://www.openstreetmap.org',
   'ODbL 1.0', '© OpenStreetMap-Mitwirkende (ODbL); Datenauswahl nach farmshops.eu (Code for Karlsruhe)', 30,
   'Offene Daten. Abfrage der OSM-Tags, die auch farmshops.eu nutzt, gefiltert auf Milch.'),
  ('file',      'Datei-Import (CSV/JSON)', null, 'abhängig von der Datei', null, 40,
   'Generische Importschnittstelle für bereitgestellte Daten.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Standorte (kanonisch, ein Eintrag pro realem Betrieb/Automat)
-- ---------------------------------------------------------------------------
create table if not exists locations (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  name_is_generated  boolean not null default false,   -- true, wenn die Quelle keinen Namen hatte
  slug               text not null unique,
  address            text,            -- Straße + Hausnummer
  postal_code        text,
  city               text,
  state              text,            -- Bundesland (aus Koordinaten abgeleitet, falls nicht angegeben)
  country            text not null default 'DE',
  latitude           double precision not null,
  longitude          double precision not null,
  geom               geography(Point, 4326)
                       generated always as (st_setsrid(st_makepoint(longitude, latitude), 4326)::geography) stored,
  location_type      location_type not null,
  sales_types        text[] not null default '{}',      -- z. B. {automat, hofladen, direktverkauf}
  raw_milk_status    raw_milk_status not null default 'unconfirmed',
  products           text[] not null default '{}',
  description        text,
  notes              text,            -- besondere Hinweise
  phone              text,
  email              text,
  website            text,
  opening_hours      text,            -- OSM opening_hours-Syntax, falls vorhanden
  is_24_7            boolean,         -- null = unbekannt
  price_per_liter    numeric(6,2),    -- EUR, null = keine Angabe
  payment_methods    text[] not null default '{}',
  organic_status     text check (organic_status in ('verified','claimed') or organic_status is null),
  organic_label      text,
  image_url          text,
  source             text not null references data_sources(key),  -- primäre Quelle
  source_url         text,
  last_verified_at   timestamptz,     -- letzte Prüfung (z. B. OSM check_date oder Redaktion)
  last_imported_at   timestamptz,
  data_quality_score int not null default 0 check (data_quality_score between 0 and 100),
  quality_flags      text[] not null default '{}',     -- z. B. {no_address, no_name, fixme}
  locked_fields      text[] not null default '{}',     -- von Admin gepflegt, nicht vom Import überschreiben
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists locations_geom_idx   on locations using gist (geom);
create index if not exists locations_state_idx  on locations (state) where is_active;
create index if not exists locations_city_idx   on locations (lower(city)) where is_active;
create index if not exists locations_plz_idx    on locations (postal_code) where is_active;
create index if not exists locations_type_idx   on locations (location_type) where is_active;
create index if not exists locations_name_trgm  on locations using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Quelldatensätze (ein Standort kann mehrere Quellen haben)
-- ---------------------------------------------------------------------------
create table if not exists location_sources (
  id              bigserial primary key,
  location_id     uuid not null references locations(id) on delete cascade,
  source          text not null references data_sources(key),
  source_id       text not null,         -- z. B. 'node/123456'
  source_url      text,
  normalized      jsonb not null,        -- vereinheitlichter Datensatz
  raw             jsonb,                 -- Originaldaten der Quelle
  content_hash    text not null,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  is_stale        boolean not null default false,  -- beim letzten Import nicht mehr enthalten
  unique (source, source_id)
);
create index if not exists location_sources_location_idx on location_sources (location_id);

-- ---------------------------------------------------------------------------
-- Änderungsprotokoll
-- ---------------------------------------------------------------------------
create table if not exists location_changes (
  id            bigserial primary key,
  location_id   uuid not null references locations(id) on delete cascade,
  changed_at    timestamptz not null default now(),
  change_source text not null,          -- 'import:osm', 'admin', 'submission:<id>', 'merge'
  import_run_id bigint,
  diff          jsonb not null          -- {feld: {from, to}}
);
create index if not exists location_changes_location_idx on location_changes (location_id, changed_at desc);

-- ---------------------------------------------------------------------------
-- Importläufe
-- ---------------------------------------------------------------------------
create table if not exists import_runs (
  id           bigserial primary key,
  source       text not null references data_sources(key),
  mode         text,                    -- z. B. 'overpass', 'snapshot', 'file:xyz.csv'
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       text not null default 'running' check (status in ('running','success','failed')),
  stats        jsonb not null default '{}',
  log          text not null default ''
);

-- ---------------------------------------------------------------------------
-- Dublettenkandidaten (zur manuellen Prüfung)
-- ---------------------------------------------------------------------------
create table if not exists duplicate_candidates (
  id           bigserial primary key,
  location_a   uuid not null references locations(id) on delete cascade,
  location_b   uuid not null references locations(id) on delete cascade,
  score        real not null,
  distance_m   real not null,
  reasons      text[] not null default '{}',
  status       text not null default 'open' check (status in ('open','merged','dismissed')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  check (location_a < location_b),
  unique (location_a, location_b)
);

-- ---------------------------------------------------------------------------
-- Nutzerbeiträge (werden vor Veröffentlichung moderiert)
-- ---------------------------------------------------------------------------
create table if not exists submissions (
  id            bigserial primary key,
  kind          submission_kind not null,
  location_id   uuid references locations(id) on delete set null,
  payload       jsonb not null,
  message       text,
  contact_email text,                   -- optional, nur für Rückfragen
  status        submission_status not null default 'pending',
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewer_note text
);
create index if not exists submissions_status_idx on submissions (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Ortsverzeichnis für die Suche (Städte, PLZ, Bundesländer)
-- ---------------------------------------------------------------------------
create table if not exists places (
  id          bigserial primary key,
  kind        text not null check (kind in ('city','postal_code','state')),
  name        text not null,
  slug        text not null,
  state       text,
  latitude    double precision not null,
  longitude   double precision not null,
  bbox        double precision[],       -- [minLon, minLat, maxLon, maxLat]
  source      text not null,            -- Herkunft der Koordinate
  unique (kind, slug)
);
create index if not exists places_name_trgm on places using gin (name gin_trgm_ops);

-- Cache für externe Geocoding-Anfragen (Nominatim)
create table if not exists geocode_cache (
  query       text primary key,
  result      jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at automatisch pflegen
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists locations_touch on locations;
create trigger locations_touch before update on locations
  for each row execute function touch_updated_at();

-- Migrationsprotokoll
create table if not exists schema_migrations (
  name        text primary key,
  applied_at  timestamptz not null default now()
);
