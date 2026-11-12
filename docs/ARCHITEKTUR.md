# Architektur & technischer Umsetzungsplan

## Überblick

```
             ┌──────────────────────── Datenquellen ─────────────────────────┐
             │ OpenStreetMap (Overpass)   farmshops.eu-Export   CSV/JSON-Datei │
             └──────────────┬───────────────────┬────────────────────┬───────┘
                            ▼                   ▼                    ▼
                    Adapter: osm.ts      (Snapshot / Seed)     Adapter: file.ts
                            └─────────► NormalizedLocation ◄─────────┘
                                              │
                         pipeline.ts: Abgleich │ Dubletten │ Zusammenführung │ Änderungsprotokoll
                                              ▼
   PostgreSQL + PostGIS: locations ◄── location_sources (je Quelle) ── import_runs, location_changes,
                         duplicate_candidates, submissions, places, data_sources
                                              │
            Next.js 16 (App Router, React 19, Tailwind 4) – serverseitig gerendert / ISR
     ┌────────────┬──────────────┬──────────────────┬──────────────────┬───────────────┐
     Startseite   Karte+Liste    Detailseiten       SEO-Landingpages   Admin-Dashboard
     (Statistik)  (Leaflet,      /standort/[slug]   /rohmilchautomaten (proxy.ts +
                  Clustering)                       /…/[bundesland]    Server Actions)
                                                    /rohmilch-in-[ort]
```

## Verzeichnisstruktur

| Pfad | Inhalt |
|---|---|
| `db/migrations/` | SQL-Migrationen (PostGIS, pg_trgm). Läuft lokal und auf Supabase |
| `data/seed/osm-milk-de.json` | Gefilterter OSM-Abzug (1.205 Objekte, ODbL) für den Offline-Import |
| `data/seed/places-de.json` | Ortsverzeichnis (Städte, PLZ) aus OSM-Adressen |
| `data/geo/bundeslaender.geo.json` | Bundeslandgrenzen (Public Domain) |
| `scripts/` | CLI: Migration, Import, Seed-Erzeugung |
| `src/lib/import/` | Import-System: Adapter, Normalisierung, Dublettenerkennung, Pipeline |
| `src/lib/` | Datenzugriff, Filterlogik, Öffnungszeiten, Auth |
| `src/app/` | Seiten und API-Routen (App Router) |
| `src/app/admin/` | Admin-Dashboard (geschützt) |
| `src/components/` | UI-Komponenten (shadcn/ui-Stil: cva + Tailwind) |
| `tests/` | Vitest-Unit-Tests |

## Datenmodell

- **`locations`**: kanonischer Datensatz pro realem Standort, mit allen Pflichtfeldern aus der Anforderung
  (id, name, slug, address, postal_code, city, state, country, latitude, longitude, location_type, description,
  phone, website, opening_hours, price_per_liter, payment_methods, image_url, source, source_url, last_verified_at,
  last_imported_at, data_quality_score, is_active, created_at, updated_at) sowie:
  `geom` (PostGIS, automatisch berechnet), `raw_milk_status`, `organic_status`, `quality_flags`, `locked_fields`, `name_is_generated`.
- **`location_sources`**: ein Eintrag je Quelle und Quell-ID, mit Original- (`raw`) und Normaldaten.
  Ein Standort kann mehrere Quellen haben, erscheint aber nur einmal auf der Karte.
- **`location_changes`**: jede Änderung als Diff (`{feld: {from, to}}`) mit Herkunft (Import, Admin, Nutzerbeitrag).
- **`import_runs`**: Protokoll, Statistik und Status jedes Imports.
- **`duplicate_candidates`**: unsichere Dublettenpaare zur manuellen Prüfung.
- **`submissions`**: Nutzerbeiträge (Fehlermeldung, Vorschlag, Ergänzung), Status `pending → approved/rejected`.
- **`places`**: Ortsverzeichnis für die Suche. **`geocode_cache`**: Cache für Nominatim.

## Import-Pipeline

1. **Adapter** liefern `NormalizedLocation`-Datensätze. Fehlende Angaben bleiben `null`.
2. **Abgleich** pro Datensatz über `(source, source_id)`:
   - bekannt und unverändert (Inhalts-Hash) → nur `last_seen_at`
   - bekannt und geändert → Quelle aktualisieren, kanonischen Datensatz neu berechnen, Diff protokollieren
   - neu → Kandidaten im Umkreis von 300 m (PostGIS `ST_DWithin`) bewerten:
     - Score ≥ 0,85 → **automatisch zusammenführen** (Quelle an bestehenden Standort hängen)
     - 0,55–0,85 → neuen Standort anlegen und **Dublettenkandidat** zur Prüfung erzeugen
3. **Bewertung** (`matchScore`): Entfernung, Namensähnlichkeit (Tokens ohne generische Wörter wie „Milchtankstelle“,
   Bigramm-Dice), normalisierte Adresse („Hauptstr. 5“ = „Hauptstraße 5“) und Standortart.
4. **Zusammenführen** (`mergeSources`): Felder nach Quellenpriorität (manuell 0 → Findhilde 20 → OSM 30 → Datei 40),
   Listen (Zahlungsarten …) werden vereinigt, die Adresse als Block aus einer Quelle übernommen.
   **Redaktionell gesperrte Felder** (`locked_fields`) werden vom Import nie überschrieben.
5. **Veraltete Einträge**: Fehlt ein Objekt in einem *vollständigen* Abzug, wird die Quelle als veraltet markiert.
   Hat ein Standort keine aktive Quelle mehr, wird er deaktiviert, nicht gelöscht. Schutz: Liefert ein Abzug
   weniger als 60 % der bekannten Datensätze, wird nichts deaktiviert.
6. **Qualitätsbewertung** 0–100 und Markierungen (`no_address`, `osm_fixme`, `possibly_disused` …) für das Admin-Dashboard.

## Frontend

- **Karte**: Leaflet 1.9 + markercluster, eigene SVG-Marker je Standortart, goldener Punkt = Rohmilch bestätigt.
  Alle ~1.200 Standorte werden einmal kompakt geladen (`/api/locations`, ≈ 430 KB bzw. ≈ 80 KB komprimiert). Filter, Umkreis,
  Sortierung und die Synchronisation zwischen Karte und Liste laufen im Browser. Für deutlich größere
  Datenmengen gibt es bereits `GET /api/locations?bbox=…` (PostGIS-Abfrage nach Kartenausschnitt).
- **Suche**: lokales Ortsverzeichnis (Städte, PLZ, Bundesländer) per Trigramm-Ähnlichkeit, mit Nominatim-Fallback für Adressen.
- **„Jetzt geöffnet“**: Auswertung der OSM-`opening_hours` mit `opening_hours.js` (inkl. Feiertage je Bundesland).
  Wird immer als „laut Angabe“ gekennzeichnet.
- **SEO**: serverseitiges Rendering bzw. ISR, `generateMetadata`, kanonische URLs, JSON-LD (`LocalBusiness`/`Store`,
  `WebSite`), dynamische `sitemap.xml`, `robots.txt`, Open-Graph-Bild.
- **Datenschutz**: keine Cookies außer dem Admin-Login, Schriftarten lokal, Standort nur im Browser, Favoriten im `localStorage`.

## Sicherheit

- Admin: Passwort aus `ADMIN_PASSWORD`, HMAC-signiertes, `httpOnly`-/`SameSite=strict`-Cookie (12 h),
  Prüfung in `src/proxy.ts` **und** in jeder Seite/Server-Aktion (`requireAdmin`). Login mit Begrenzung der Versuche.
- Nutzerbeiträge: Zod-Validierung, Honeypot-Feld, Ratenbegrenzung, Moderation vor jeder Veröffentlichung.
- SQL ausschließlich parametrisiert. Popup-HTML wird escaped.

## Erweiterungen (vorbereitet, nicht umgesetzt)

- Bewertungen/Erfahrungsberichte: neue Tabelle `reviews` mit derselben Moderation wie `submissions`.
- Supabase Auth für mehrere Redakteure statt eines gemeinsamen Passworts.
- Eigener Kachelserver bzw. Vektor-Tiles, wenn die Zugriffszahlen steigen (OSM Tile Usage Policy).
