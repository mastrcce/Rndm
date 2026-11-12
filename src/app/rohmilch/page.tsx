import type { Metadata } from "next";
import { Prose } from "@/components/prose";
import { SafetyNotice } from "@/components/safety-notice";

export const metadata: Metadata = {
  title: "Rohmilch: Abkochen, Hygiene & rechtliche Hinweise",
  description: "Was ist Rohmilch, warum sollte sie vor dem Verzehr abgekocht werden und welche Regeln gelten für den Verkauf ab Hof in Deutschland? Mit Links zu offiziellen Stellen.",
  alternates: { canonical: "/rohmilch" },
};

export default function RawMilkInfoPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-medium sm:text-5xl">Rohmilch: Wissen & Hinweise</h1>
      <SafetyNotice className="mt-8" />
      <Prose>
        <h2>Was ist Rohmilch?</h2>
        <p>
          Rohmilch ist Milch, die nach dem Melken nicht über 40 °C erhitzt und keiner Behandlung mit vergleichbarer Wirkung
          unterzogen wurde. Sie ist also weder pasteurisiert noch ultrahocherhitzt. In Deutschland wird Rohmilch vor allem direkt
          auf Milchviehbetrieben verkauft – häufig über sogenannte Milchtankstellen oder Milchautomaten.
        </p>

        <h2>Warum abkochen?</h2>
        <p>
          Auch bei sorgfältiger Hygiene im Stall kann Rohmilch krankmachende Keime enthalten, zum Beispiel Campylobacter,
          EHEC (Shiga-Toxin bildende E. coli), Salmonellen oder Listerien. Durch Abkochen werden diese Erreger zuverlässig
          abgetötet. Für Säuglinge, Kleinkinder, Schwangere, ältere und immungeschwächte Menschen ist das Risiko schwerer
          Erkrankungen besonders hoch.
        </p>
        <ul>
          <li>Rohmilch vor dem Verzehr kurz aufkochen (sprudelnd kochen lassen).</li>
          <li>Gekühlt bei höchstens 8 °C lagern und zügig verbrauchen – Hinweise des Betriebs zur Haltbarkeit beachten.</li>
          <li>Saubere, verschließbare Gefäße verwenden; Mehrwegflaschen gründlich heiß reinigen.</li>
        </ul>

        <h2>Rechtlicher Rahmen</h2>
        <p>
          Die Abgabe von Rohmilch an Verbraucherinnen und Verbraucher ist in Deutschland in der Tierische
          Lebensmittel-Hygieneverordnung (Tier-LMHV) geregelt. Rohmilch darf danach grundsätzlich nur direkt im
          Erzeugerbetrieb abgegeben werden („Milch ab Hof“), die Abgabe muss der zuständigen Behörde angezeigt werden, und an
          der Abgabestelle muss gut sichtbar der Hinweis <strong>„Rohmilch, vor dem Verzehr abkochen“</strong> angebracht sein.
          Für Vorzugsmilch gelten gesonderte, strengere Anforderungen.
        </p>
        <p>
          Dieses Verzeichnis gibt die Angaben der Datenquellen wieder. Ob ein Betrieb die Vorgaben einhält, prüfen die
          zuständigen Lebensmittelüberwachungsbehörden – nicht wir.
        </p>

        <h2>Offizielle Informationen</h2>
        <ul>
          <li><a href="https://www.gesetze-im-internet.de/tier-lmhv/" target="_blank" rel="noopener noreferrer">Tierische Lebensmittel-Hygieneverordnung (Tier-LMHV) – Gesetze im Internet</a></li>
          <li><a href="https://www.bfr.bund.de/" target="_blank" rel="noopener noreferrer">Bundesinstitut für Risikobewertung (BfR)</a> – Verbraucherinformationen zu Rohmilch (Suche: „Rohmilch“)</li>
          <li><a href="https://www.bzfe.de/" target="_blank" rel="noopener noreferrer">Bundeszentrum für Ernährung (BZfE)</a></li>
          <li><a href="https://www.bvl.bund.de/" target="_blank" rel="noopener noreferrer">Bundesamt für Verbraucherschutz und Lebensmittelsicherheit (BVL)</a></li>
          <li><a href="https://www.lebensmittelwarnung.de/" target="_blank" rel="noopener noreferrer">Lebensmittelwarnung.de</a> – offizielle Warnungen der Länder</li>
        </ul>

        <h2>Wie zuverlässig sind die Angaben hier?</h2>
        <p>
          Die Standorte stammen aus offenen Datenquellen und Meldungen von Nutzerinnen und Nutzern. Wir kennzeichnen
          ausdrücklich, ob eine Quelle Rohmilch bestätigt („Rohmilch laut Quelle bestätigt“) oder nur allgemein Milchverkauf
          angibt. Öffnungszeiten und Verfügbarkeit werden nicht vor Ort geprüft. Bitte informiere dich im Zweifel direkt beim Betrieb.
        </p>
      </Prose>
    </article>
  );
}
