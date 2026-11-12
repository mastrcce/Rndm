import Link from "next/link";
import { LogoMark } from "./logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-forest-950 text-cream-200">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-lg font-semibold text-cream-50">Rohmilch-Atlas</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-cream-200/80">
            Verzeichnis von Milchautomaten, Hofläden und Verkaufsstellen mit Milch ab Hof in Deutschland.
            Alle Angaben ohne Gewähr – Verfügbarkeit und Öffnungszeiten bitte vor Ort bzw. beim Betrieb prüfen.
          </p>
          <p className="mt-4 rounded-xl border border-cream-200/15 bg-white/5 px-4 py-3 text-sm text-cream-50">
            <strong>Rohmilch vor dem Verzehr abkochen.</strong>{" "}
            <Link href="/rohmilch" className="underline decoration-sage-400 underline-offset-2">Warum?</Link>
          </p>
        </div>
        <div>
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-sage-300">Verzeichnis</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/#karte" className="hover:text-white">Karte</Link></li>
            <li><Link href="/rohmilchautomaten" className="hover:text-white">Milchautomaten nach Bundesland</Link></li>
            <li><Link href="/standort-vorschlagen" className="hover:text-white">Standort vorschlagen</Link></li>
            <li><Link href="/favoriten" className="hover:text-white">Meine Favoriten</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-sage-300">Informationen</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/rohmilch" className="hover:text-white">Wissen & Hygienehinweise</Link></li>
            <li><Link href="/datenquellen" className="hover:text-white">Datenquellen & Lizenzen</Link></li>
            <li><Link href="/impressum" className="hover:text-white">Impressum</Link></li>
            <li><Link href="/datenschutz" className="hover:text-white">Datenschutz</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream-200/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-cream-200/60 sm:px-6">
          Standortdaten: © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende,
          verfügbar unter der Open Database License (ODbL). Datenauswahl angelehnt an{" "}
          <a className="underline" href="https://www.farmshops.eu">farmshops.eu</a> (Code for Karlsruhe).
        </p>
      </div>
    </footer>
  );
}
