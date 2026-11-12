# Rohmilch-Atlas als App

Der Rohmilch-Atlas ist eine **Progressive Web App (PWA)**. Er lässt sich direkt von der Website auf
iPhone, iPad, Android-Geräten und am Computer installieren, ohne App Store, Mac oder Entwicklerkonto.

## Was die App kann

| Funktion | Umsetzung |
|---|---|
| Eigenes App-Symbol, Vollbild ohne Browserleiste | `src/app/manifest.ts` (Web-App-Manifest), Icons in `public/icons/`, `src/app/apple-icon.png` |
| Installation | Android/Chrome/Edge: Knopf „App installieren“ (`beforeinstallprompt`). iPhone: Anleitung „Teilen → Zum Home-Bildschirm“ (`src/components/pwa/install-button.tsx`, Seite `/app`) |
| Schnellzugriffe (langes Drücken aufs Symbol, Android) | Karte, Favoriten, Standort vorschlagen (`shortcuts` im Manifest) |
| Offline-Betrieb | Service Worker `public/sw.js` (siehe unten) |
| Offline-Hinweis | Leiste „Du bist offline …“ (`src/components/pwa/offline-banner.tsx`) |

## Offline-Strategie (`public/sw.js`)

| Inhalt | Strategie |
|---|---|
| Startseite, Favoriten, Offline-Seite | beim Installieren vorab gespeichert (inkl. der benötigten JS/CSS-Dateien) |
| `/_next/static/*`, Icons | Cache zuerst (Dateien sind versioniert und unveränderlich) |
| Standortliste `/api/locations` | stale-while-revalidate: sofort aus dem Cache, im Hintergrund aktualisiert |
| Favoriten `/api/locations?ids=…` | Netz zuerst, offline aus der gespeicherten Gesamtliste gefiltert |
| Seitenaufrufe | Netz zuerst, besuchte Seiten (max. 40) offline verfügbar, sonst Seite `/offline` |
| Kartenkacheln | Cache zuerst, max. 400 Kacheln |
| Admin, Meldungen, Ortssuche | nie gecacht |

Der Service Worker wird nur im Produktionsbetrieb registriert (`npm run build && npm start`), nicht in `npm run dev`.
Nach Änderungen an `public/sw.js` die Konstante `VERSION` erhöhen, damit alte Caches gelöscht werden.

## Getestet (Chromium, Pixel-7-Emulation)

- Manifest und Installierbarkeit: keine Fehler (`Page.getInstallabilityErrors` leer)
- Service Worker aktiv
- Offline: Startseite zeigt die gespeicherten Standorte, besuchte Detailseite lädt, Favoriten funktionieren auch
  ohne vorherigen Besuch, nicht gespeicherte Seiten zeigen die Offline-Seite

## Später: in den App Store / Play Store?

Für die Stores lässt sich dieselbe Website verpacken:

- **Google Play**: als *Trusted Web Activity* (z. B. mit Bubblewrap/PWABuilder). Benötigt ein Google-Play-Entwicklerkonto
  (einmalig 25 $) und die Datei `/.well-known/assetlinks.json`.
- **Apple App Store**: Hülle mit *Capacitor* oder PWABuilder. Benötigt einen Mac mit Xcode und das Apple Developer
  Program (99 $/Jahr). Apple verlangt dafür meist zusätzliche native Funktionen.

Für die meisten Nutzer reicht die PWA. Sie ist sofort verfügbar und wird automatisch aktualisiert.
