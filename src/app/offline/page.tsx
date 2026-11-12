import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <WifiOff className="mx-auto size-10 text-sage-600" aria-hidden />
      <h1 className="mt-4 text-3xl font-medium">Du bist gerade offline</h1>
      <p className="mt-3 text-muted">
        Diese Seite wurde noch nicht auf deinem Gerät gespeichert. Die Karte mit den zuletzt geladenen Standorten,
        deine Favoriten und bereits besuchte Standortseiten funktionieren auch ohne Internet.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild><Link href="/">Zur Karte</Link></Button>
        <Button asChild variant="secondary"><Link href="/favoriten">Meine Favoriten</Link></Button>
      </div>
    </div>
  );
}
