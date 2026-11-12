# Phase 1 – Analyse der Datenquellen

> **Erweiterung (12.11.2026):** Neben Milch werden jetzt auch Eier, Honig, Fleisch & Wurst und Käse erfasst.
> Aufgenommen wird ein Standort nur, wenn die Quelle das Produkt ausdrücklich nennt: Automatensortiment (`vending=eggs;honey;…`),
> Produktlisten (`products`, `produce`), `vending:<produkt>=yes`, Imkerei (`craft=beekeeper` → Honig) oder ein eindeutiger
> Begriff im Namen (z. B. „Eierautomat“, „Hofkäserei“). Ergebnis: 4.830 Standorte (Milch 1.188, Eier 1.881, Honig 1.835,
> Fleisch & Wurst 718, Käse 219). „Rohhonig“ nennt keine einzige Quelle ausdrücklich, deshalb gibt es nur die Kategorie „Honig“.

Stand der Analyse: 12.11.2026

## Kurzfassung

| Quelle | Technischer Zugang | Rechtlich nutzbar? | Status im Projekt |
|---|---|---|---|
| **farmshops.eu** | Open-Source-Projekt (Code for Karlsruhe). Daten stammen vollständig aus **OpenStreetMap** und liegen als JSON im öffentlichen GitHub-Repository `CodeforKarlsruhe/farmshops.eu` (`data/`). Gleiche Daten direkt per **Overpass-API**. | **Ja.** Code: MIT. Daten: OpenStreetMap, **ODbL 1.0** (Namensnennung + Weitergabe unter gleichen Bedingungen). | ✅ **Funktioniert.** 1.205 OSM-Objekte mit Milchbezug in Deutschland → 1.188 Standorte nach Zusammenführung |
| **findhilde.de** | Keine öffentliche API und kein Datenexport bekannt. Die Website war aus der Entwicklungsumgebung **nicht erreichbar** (Netzwerkrichtlinie: HTTP 403 am Proxy). robots.txt und Nutzungsbedingungen konnten daher nicht geprüft werden. | **Unklar → nicht ohne Erlaubnis.** Ohne offene Lizenz sind die Einträge als Datenbank urheberrechtlich geschützt (§ 87a ff. UrhG). | ⛔ **Kein automatischer Import.** Alternative: Datei-Import (CSV/JSON) eines **genehmigten** Exports |

## farmshops.eu im Detail

- **Was es ist:** Eine Leaflet-Karte von Hofläden, Milchautomaten, Märkten und Imkern in der DACH-Region.
  Die README des Projekts sagt ausdrücklich: *„Die Karte erhält alle ihre Daten von OpenstreetMap“*.
- **Wie die Daten entstehen:** Das Skript `update_data.js` fragt die Overpass-API ab
  (`vending~milk|egg|…`, `shop=farm`, `amenity=marketplace`, `craft=beekeeper`) und schreibt
  pro OSM-Objekt eine `data/<node|way|relation>/<id>/details.json` mit allen OSM-Tags.
- **Zugriff ohne Scraping:** Statt die Website abzurufen, nutzen wir
  1. den **öffentlichen Datenexport auf GitHub** (`git clone`, Abruf von 2026-11-12, Datenstand 25.10.2026) oder
  2. **dieselben OSM-Daten direkt über Overpass** (`npm run import:osm -- --mode overpass`).
  Beides ist lizenzrechtlich sauber (ODbL) und belastet farmshops.eu nicht.
- **Umfang:** 25.700 OSM-Objekte (DACH), davon nach Filterung **1.205 mit Milchbezug in Deutschland**.

### Welche Felder liefert OSM?

Auswertung der 1.636 Objekte mit Milchbezug im DACH-Abzug (Anteil, wie oft ein Feld vorkommt):

| Information | OSM-Tag(s) | Abdeckung |
|---|---|---|
| Art | `amenity=vending_machine`, `vending=*`, `shop=farm` | 100 % |
| Name | `name`, `brand` | ≈ 52 % |
| Adresse | `addr:street`, `addr:housenumber`, `addr:postcode`, `addr:city` | ≈ 22 % |
| Öffnungszeiten | `opening_hours` (davon 421× `24/7`) | ≈ 44 % |
| Zahlungsarten | `payment:*` | ≈ 30 % |
| Telefon / Website | `phone`, `website`, `contact:*` | ≈ 15 % / 24 % |
| Rohmilch ausdrücklich | `milk=raw_milk`, `drink:raw_milk=yes` oder „Rohmilch“ im Text | ≈ 14 % |
| Bio | `organic=*`, `organic:label` | ≈ 8 % (nur Angabe, keine Zertifikatsprüfung) |
| Preis pro Liter | `price:milk` | praktisch nie vorhanden |
| Bild | `image`, `wikimedia_commons` | ≈ 1 % |
| Prüfdatum | `check_date` | ≈ 20 % |

**Konsequenz für die Website:** Viele Felder fehlen. Sie werden als „Keine Angabe“ angezeigt und nicht ergänzt.
Fehlende Angaben können Nutzer über „Infos ergänzen“ melden (mit Moderation).

### Filter: Was zählt als Rohmilch-Standort?

Aufgenommen wird ein OSM-Objekt, wenn es in Deutschland liegt (Punkt-in-Polygon mit den Bundeslandgrenzen) und
mindestens eines davon zutrifft:

- `vending` enthält `milk` oder `raw_milk`, oder `vending:milk=yes`
- `milk=*` (außer `no`), `drink:raw_milk`, `drink:milk`, `food:milk`
- `product`/`products`/`produce` enthält `milk`
- Name enthält „Milch“ (z. B. „Milchtankstelle“, „Milchhäusle“)

Ausgeschlossen werden ausdrücklich pasteurisierte Milch (`milk=pasteurised`) und `milk=no`.

Die Kennzeichnung **„Rohmilch laut Quelle bestätigt“** erhält ein Standort nur bei `milk=raw_milk`,
`drink:raw_milk=yes|retail`, `vending=raw_milk` oder dem Wort „Rohmilch“/„Vorzugsmilch“ in Name/Beschreibung.
Alle anderen Standorte heißen „Milchverkauf – Rohmilch nicht ausdrücklich bestätigt“.
Milchtankstellen auf Höfen verkaufen in Deutschland zwar fast immer Rohmilch, aber das wird nicht behauptet,
solange die Quelle es nicht sagt.

## findhilde.de im Detail

- **Erreichbarkeit:** Aus der Cloud-Entwicklungsumgebung wurde jede Verbindung zu `findhilde.de` vom
  Netzwerk-Proxy abgelehnt (`CONNECT tunnel failed, response 403`). Eine Freigabe der Domain wurde
  angefragt und nicht erteilt. Inhalte, `robots.txt` und AGB konnten daher **nicht geprüft** werden.
- **Öffentliche Schnittstellen:** Auf GitHub gibt es kein Repository und keinen Datenexport zu Findhilde
  (Suche nach „findhilde“: 0 Treffer).
- **Rechtliche Einschätzung:** Ohne ausdrückliche offene Lizenz ist eine systematisch aufgebaute
  Standortsammlung durch das Datenbankherstellerrecht geschützt. Scraping ohne Erlaubnis kommt deshalb nicht in Frage.
- **Umgesetzte Alternative:**
  1. Datenquelle `findhilde` ist in der Datenbank angelegt (Priorität 20, höher als OSM).
  2. Ein genehmigter Export (CSV, JSON oder GeoJSON) kann im Admin-Bereich unter **Importe → Datei-Import**
     mit Quelle „Findhilde.de“ hochgeladen werden, oder per CLI:
     `npm run import:file -- export.csv --source findhilde`.
  3. Dubletten zu OSM-Einträgen werden automatisch erkannt und zusammengeführt. Jeder Betrieb erscheint nur einmal.
- **Empfohlener nächster Schritt:** Den Betreiber von Findhilde.de anfragen, ob ein Datenaustausch oder eine
  Kooperation möglich ist. Spaltenformat: siehe [IMPORT-FORMAT.md](IMPORT-FORMAT.md).

## Weitere verwendete offene Daten

| Daten | Quelle | Lizenz | Verwendung |
|---|---|---|---|
| Bundeslandgrenzen | github.com/isellsoap/deutschlandGeoJSON (generalisiert) | Public Domain (Unlicense) | Zuordnung Koordinate → Bundesland, Filter „liegt in Deutschland“ |
| Ortsverzeichnis (Städte/PLZ) | Adressangaben aller 25.700 OSM-Objekte des farmshops-Abzugs | ODbL | Suche nach Ort/PLZ ohne externen Dienst (5.360 Einträge) |
| Geocoding-Fallback | Nominatim (OSM Foundation) | ODbL, Nutzungsrichtlinie max. 1 Anfrage/s | Adresssuche, wenn das Ortsverzeichnis nichts findet |

## Lizenzpflichten (ODbL)

- Namensnennung „© OpenStreetMap-Mitwirkende“ auf jeder Seite (Footer) und auf Detailseiten (Quelle mit Link zum OSM-Objekt).
- Die aus OSM abgeleitete Standortdatenbank muss bei Weitergabe ebenfalls unter ODbL stehen (Share-Alike).
  Eigene, nicht aus OSM stammende Ergänzungen (Admin-Pflege) sollten getrennt bleiben. Das ist über `location_sources` möglich.
