import { Smartphone, WifiOff, Zap } from "lucide-react";
import type { Metadata } from "next";
import { IosInstructions, InstallButton } from "@/components/pwa/install-button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Rohmilch-Atlas als App",
  description: "Installiere den Rohmilch-Atlas kostenlos auf deinem iPhone oder Android-Smartphone – ohne App Store, mit Offline-Karte und Favoriten.",
  alternates: { canonical: "/app" },
};

export default function AppPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-semibold sm:text-5xl">Der Rohmilch-Atlas als App</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Leg den Rohmilch-Atlas auf deinen Startbildschirm – kostenlos, ohne App Store und ohne Konto.
        Er startet dann wie eine normale App im Vollbild.
      </p>
      <InstallButton variant="primary" className="mt-6" />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Smartphone, title: "Wie eine echte App", text: "Eigenes Symbol auf dem Startbildschirm, Vollbild ohne Browserleiste." },
          { icon: WifiOff, title: "Auch offline", text: "Zuletzt geladene Standorte, Favoriten und besuchte Seiten bleiben ohne Internet verfügbar." },
          { icon: Zap, title: "Immer aktuell", text: "Updates kommen automatisch – kein Herunterladen, kaum Speicherplatz." },
        ].map(({ icon: Icon, title, text }) => (
          <Card key={title} className="p-5">
            <Icon className="size-6 text-sage-600" aria-hidden />
            <h2 className="mt-3 text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </Card>
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold">iPhone & iPad (Safari)</h2>
          <div className="mt-4"><IosInstructions inline /></div>
          <p className="mt-4 text-xs text-muted">Funktioniert nur in Safari (ab iOS 16.4 auch in anderen Browsern über „Teilen“).</p>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Android (Chrome)</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
            <li>Tippe oben auf <strong>App installieren</strong> – oder im Chrome-Menü <strong>⋮</strong> auf <strong>App installieren</strong> bzw. <strong>Zum Startbildschirm hinzufügen</strong>.</li>
            <li>Bestätige mit <strong>Installieren</strong>.</li>
            <li>Die App erscheint in deiner App-Übersicht.</li>
          </ol>
        </Card>
      </div>
      <p className="mt-8 text-sm text-muted">
        Am Computer (Chrome oder Edge) kannst du die App über das Installations-Symbol in der Adressleiste hinzufügen.
      </p>
    </div>
  );
}
