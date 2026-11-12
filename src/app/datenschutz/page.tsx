import type { Metadata } from "next";
import { Prose } from "@/components/prose";

export const metadata: Metadata = { title: "Datenschutz", alternates: { canonical: "/datenschutz" } };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-semibold">Datenschutzerklärung</h1>
      <Prose>
        <p className="rounded-xl bg-warn-bg px-4 py-3 text-warn-fg">
          Entwurf – vor dem Livegang vom Betreiber zu prüfen und um Verantwortlichen, Hosting-Anbieter und Auftragsverarbeiter zu ergänzen.
        </p>
        <h2>Grundsatz</h2>
        <p>Der Rohmilch-Finder kommt ohne Nutzerkonto, ohne Tracking und ohne Werbe-Cookies aus. Schriftarten werden lokal ausgeliefert.</p>
        <h2>Standortfreigabe</h2>
        <p>
          Wenn du „Standort verwenden“ wählst, fragt dein Browser um Erlaubnis. Die Koordinaten werden ausschließlich in deinem
          Browser zur Entfernungsberechnung und Kartendarstellung genutzt und nicht an unseren Server übertragen oder gespeichert
          (Art. 6 Abs. 1 lit. a DSGVO – Einwilligung, jederzeit im Browser widerrufbar).
        </p>
        <h2>Ortssuche</h2>
        <p>
          Suchbegriffe (Ort, PLZ, Adresse) werden an unseren Server gesendet und dort im eigenen Ortsverzeichnis gesucht. Findet sich
          dort kein Treffer, kann die Anfrage – ohne deine IP-Adresse – an den Geocoding-Dienst Nominatim der OpenStreetMap Foundation
          weitergeleitet werden. Suchbegriffe werden zur Beschleunigung zwischengespeichert, ohne Bezug zu deiner Person.
        </p>
        <h2>Kartenkacheln</h2>
        <p>
          Die Kartenbilder werden direkt von einem Kachelserver geladen (standardmäßig OpenStreetMap). Dabei wird deine IP-Adresse
          an diesen Server übermittelt. Betreiber, die das vermeiden möchten, können einen eigenen Kachelserver konfigurieren.
        </p>
        <h2>Favoriten</h2>
        <p>Gemerkte Standorte werden nur im lokalen Speicher deines Browsers (localStorage) abgelegt und nie an uns übertragen.</p>
        <h2>Meldungen und Vorschläge</h2>
        <p>
          Wenn du einen Fehler meldest oder einen Standort vorschlägst, speichern wir deine Angaben zur Prüfung. Eine E-Mail-Adresse
          ist freiwillig und wird nur für Rückfragen verwendet und nicht veröffentlicht (Art. 6 Abs. 1 lit. a DSGVO). Du kannst die
          Löschung jederzeit verlangen.
        </p>
        <h2>Server-Logs</h2>
        <p>Beim Aufruf der Seite verarbeitet der Hosting-Anbieter technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt) zur Auslieferung und Absicherung.</p>
        <h2>Deine Rechte</h2>
        <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie auf Beschwerde bei einer Aufsichtsbehörde.</p>
      </Prose>
    </article>
  );
}
