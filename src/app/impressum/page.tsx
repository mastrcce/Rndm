import type { Metadata } from "next";
import { Prose } from "@/components/prose";

export const metadata: Metadata = { title: "Impressum", robots: { index: false } };

/**
 * ACHTUNG Betreiber: Vor der Veröffentlichung müssen hier die Pflichtangaben nach § 5 DDG
 * (Name, Anschrift, Kontakt) eingetragen werden. Es werden bewusst keine Angaben erfunden.
 */
export default function ImpressumPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-semibold">Impressum</h1>
      <Prose>
        <p className="rounded-xl bg-warn-bg px-4 py-3 text-warn-fg">
          Platzhalter: Die Angaben nach § 5 Digitale-Dienste-Gesetz (DDG) werden vom Betreiber vor dem Livegang ergänzt.
        </p>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>[Name / Organisation]<br />[Straße, Hausnummer]<br />[PLZ Ort]</p>
        <h2>Kontakt</h2>
        <p>E-Mail: [E-Mail-Adresse]</p>
        <h2>Verantwortlich für den Inhalt</h2>
        <p>[Name, Anschrift]</p>
        <h2>Haftung für Inhalte</h2>
        <p>
          Die Standortangaben stammen überwiegend aus offenen Datenquellen und Nutzerbeiträgen. Trotz sorgfältiger Aufbereitung
          übernehmen wir keine Gewähr für Richtigkeit, Vollständigkeit und Aktualität – insbesondere nicht für Öffnungszeiten,
          Verfügbarkeit und Preise.
        </p>
      </Prose>
    </article>
  );
}
