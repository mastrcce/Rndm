# Datei-Importformat (CSV / JSON / GeoJSON)

Über diese Schnittstelle lassen sich Daten einspielen, die nicht automatisch abgerufen werden können,
z. B. ein **genehmigter** Export von Findhilde.de oder eine eigene Recherche.

- Admin-Bereich → **Importe & Quellen** → Datei-Import (Quelle wählen), oder
- CLI: `npm run import:file -- pfad/zur/datei.csv --source findhilde`

Datei-Importe sind **Teilmengen**. Sie legen an und aktualisieren, deaktivieren aber nie Standorte, die in der Datei fehlen.
Ein erneuter Import derselben Datei ist idempotent (Erkennung über `source_id`).

## Spalten

Spaltennamen dürfen deutsch oder englisch sein (Groß-/Kleinschreibung egal). CSV-Trennzeichen `,` `;` oder Tab werden erkannt.

| Feld | Alternativen | Pflicht | Hinweise |
|---|---|---|---|
| `latitude` | `lat`, `breitengrad` | **ja** | WGS84, Dezimalpunkt oder -komma |
| `longitude` | `lon`, `lng`, `laengengrad` | **ja** | Punkte außerhalb Deutschlands werden übersprungen |
| `source_id` | `id`, `quell_id`, `external_id` | empfohlen | stabile ID in der Quelle → Updates statt Duplikate |
| `name` | `betrieb`, `bezeichnung` | | |
| `address` | `adresse`, `strasse` | | Straße + Hausnummer |
| `postal_code` | `plz` | | |
| `city` | `ort`, `stadt`, `gemeinde` | | |
| `state` | `bundesland` | | wird aus Koordinaten bestimmt; Abweichung wird markiert |
| `location_type` | `typ`, `art` | | `Milchautomat`/`Milchtankstelle`, `Verkaufsautomat`, `Hofladen`, `Bauernhof`, `Imkerei`, `Direktverkauf` |
| `categories` | `produkte`, `kategorien` | | z. B. `Milch\|Eier\|Honig`, mögliche Werte: Milch, Eier, Honig, Fleisch/Wurst, Käse. Leer → Milch |
| `raw_milk` | `rohmilch` | | `ja` → „Rohmilch bestätigt“ (Milch wird ergänzt), `nein` → Milch wird entfernt, leer → unbestätigt |
| `opening_hours` | `oeffnungszeiten` | | möglichst OSM-Syntax, z. B. `Mo-Su 06:00-22:00` oder `24/7` |
| `price_per_liter` | `preis` | | Euro, z. B. `1,40` |
| `payment_methods` | `zahlungsarten`, `zahlung` | | durch `,` `;` oder `\|` getrennt; bei `;`-CSV bitte `\|` verwenden |
| `phone`, `email`, `website` | `telefon`, `mail`, `webseite` | | |
| `description`, `notes` | `beschreibung`, `hinweise` | | |
| `organic` | `bio` | | `ja` → „Bio laut Quelle“ |
| `image_url` | `bild` | | nur mit Nutzungsrecht! |
| `source_url` | `link` | | Link zum Eintrag in der Quelle |
| `last_verified_at` | `geprueft_am`, `stand` | | Datum der letzten Prüfung |

Eine leere Vorlage liegt unter [`import-vorlage.csv`](import-vorlage.csv).

## JSON

Erlaubt sind:

- ein Array von Objekten mit den obigen Feldern,
- `{ "locations": [ … ] }`,
- eine GeoJSON-`FeatureCollection` mit Punkt-Geometrien (Felder in `properties`).
