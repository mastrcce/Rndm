# Rohmilch-Finder Deutschland

Verzeichnis von Rohmilchautomaten, Milchtankstellen, Hofläden und Bauernhöfen mit Milchverkauf in Deutschland:
eine interaktive Karte, Suche nach Ort, PLZ und Umkreis, Detailseiten und ein Admin-Dashboard mit Datenimport,
Dublettenprüfung und Moderation.

**Datenstand im Repository:** 1.205 OSM-Objekte → **1.188 Standorte** in allen 16 Bundesländern
(941 Automaten, 237 Hofläden, 163 mit ausdrücklich bestätigter Rohmilch). Quelle: OpenStreetMap via farmshops.eu, Stand 25.10.2026.

> Rohmilch vor dem Verzehr abkochen. Die Website weist auf jeder Seite darauf hin.

## Funktionen

- **Startseite**: Suche (Stadt, PLZ, Adresse), „Standort verwenden“, Statistiken, Karte und Liste
- **Karte** (Leaflet + OpenStreetMap): unterschiedliche Marker je Standortart, Clustering, Info-Popup mit
  Navigation über Google Maps oder Apple Karten, eigener Standort, Liste synchron zum Kartenausschnitt
- **Filter**: Milchautomat, Verkaufsautomat, Hofladen, Bauernhof, Direktverkauf · Umkreis 5/10/25/50/100 km ·
  24/7 und „jetzt geöffnet“ (nur laut Angabe) · Rohmilch bestätigt · Bio (laut Quelle) · Zahlungsarten · Sortierung nach Entfernung
- **Detailseiten** `/standort/[slug]`: alle Felder, fehlende als „Keine Angabe“, Öffnungszeiten als Wochentabelle,
  Herkunft der Daten mit Lizenz und Link, Datum der letzten Prüfung und Aktualisierung, Standorte in der Nähe, JSON-LD
- **Nutzerfunktionen**: Favoriten (lokal im Browser), Teilen, Fehler melden, Infos ergänzen, Standort vorschlagen.
  Alles wird vor der Veröffentlichung moderiert
- **SEO**: `/rohmilchautomaten`, `/rohmilchautomaten/bayern`, `/rohmilch-in-rosenheim`, Sitemap, robots.txt, Open Graph, ISR
- **Admin** (`/admin`): Standorte verwalten, anlegen, bearbeiten und löschen, Importe starten (Overpass/Seed/Datei),
  Importprotokolle, Datenquellen, Dublettenprüfung mit Zusammenführen, Moderation, Qualitätsstatistiken, Änderungsprotokoll

## Datenquellen

| Quelle | Status |
|---|---|
| farmshops.eu / OpenStreetMap | ✅ importiert (offene Daten, ODbL). Live-Abgleich per Overpass-API möglich |
| findhilde.de | ⛔ kein offener Datenzugang. Import nur mit Genehmigung über die CSV/JSON-Schnittstelle |

Details, Feldabdeckung und rechtliche Bewertung: **[docs/DATENQUELLEN.md](docs/DATENQUELLEN.md)**.
Architektur und Import-Pipeline: **[docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md)**. Dateiformat: **[docs/IMPORT-FORMAT.md](docs/IMPORT-FORMAT.md)**.

## Technik

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Komponenten im shadcn/ui-Stil · Leaflet + markercluster ·
PostgreSQL 16 + PostGIS 3 (lokal oder Supabase) · Zod · Vitest.

## Lokal starten

Voraussetzungen: Node.js ≥ 20, PostgreSQL mit PostGIS (z. B. `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgis/postgis:16-3.4`).

```bash
npm install
cp .env.example .env.local          # DATABASE_URL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET anpassen
npm run db:migrate                  # Schema anlegen
npm run import:osm -- --mode seed   # 1.188 Standorte aus dem mitgelieferten OSM-Abzug importieren
npm run dev                         # http://localhost:3000  (Admin: /admin)
```

### Import-Befehle

```bash
npm run import:osm -- --mode overpass               # live aus OpenStreetMap (Deutschland, nur Milch-Tags)
npm run import:osm -- --mode snapshot               # aus einem Klon von github.com/CodeforKarlsruhe/farmshops.eu
npm run import:file -- export.csv --source findhilde  # genehmigter Datei-Export
npm run dedupe                                       # Bestand auf mögliche Dubletten prüfen
npx tsx scripts/import/run.ts build-seed --dir <farmshops-klon>  # Seed-Dateien neu erzeugen
```

Alle Importe sind idempotent. Ein zweiter Lauf ändert nur, was sich in der Quelle geändert hat.

### Tests

```bash
npm test          # Unit-Tests (Normalisierung, Dubletten, Filter, Datei-Import, Öffnungszeiten, Sitzung)
npm run lint
npm run typecheck
```

## Deployment (Vercel + Supabase)

1. **Supabase**: Projekt anlegen und unter *Database → Extensions* `postgis` aktivieren (`pg_trgm` und `unaccent` legt die Migration an).
   Connection-String (Transaction Pooler) kopieren.
2. Lokal gegen Supabase migrieren und importieren:
   `DATABASE_URL=… DATABASE_SSL=true npm run db:migrate && … npm run import:osm -- --mode overpass`
3. **Vercel**: Repository importieren und Umgebungsvariablen setzen: `DATABASE_URL`, `DATABASE_SSL=true`, `NEXT_PUBLIC_SITE_URL`,
   `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (≥ 32 Zeichen), optional `NOMINATIM_USER_AGENT` mit Kontaktadresse,
   `NEXT_PUBLIC_TILE_URL`.
4. **Regelmäßiger Abgleich**: GitHub-Workflow `.github/workflows/datenabgleich.yml` (wöchentlich). Dafür das Secret `DATABASE_URL`
   und die Repository-Variable `ENABLE_DATA_SYNC=true` setzen. Alternativ im Admin-Bereich „Import starten“.

### Vor dem Livegang

- [ ] Impressum (`src/app/impressum/page.tsx`) mit den Betreiberdaten ausfüllen
- [ ] Datenschutzerklärung prüfen und um Hosting-Anbieter und Auftragsverarbeiter ergänzen
- [ ] Bei viel Traffic eigenen Kachelserver bzw. Anbieter für die Kartenkacheln konfigurieren (OSM Tile Usage Policy)
- [ ] Links zu offiziellen Rohmilch-Informationen auf `/rohmilch` prüfen
- [ ] Betreiber von findhilde.de wegen eines Datenaustauschs anfragen

## Lizenzen

- Standortdaten: © OpenStreetMap-Mitwirkende, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/).
  Die abgeleitete Datenbank unterliegt ebenfalls der ODbL.
- Datenauswahl angelehnt an [farmshops.eu](https://github.com/CodeforKarlsruhe/farmshops.eu) (MIT).
- Bundeslandgrenzen: [deutschlandGeoJSON](https://github.com/isellsoap/deutschlandGeoJSON) (Public Domain).
