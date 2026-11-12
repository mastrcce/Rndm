import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmissionForm } from "@/components/forms/submission-form";
import { getLocationBySlug } from "@/lib/locations";

export const metadata: Metadata = { title: "Fehler melden", robots: { index: false } };

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = await getLocationBySlug(slug);
  if (!l) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href={`/standort/${l.slug}`} className="text-sm text-muted hover:text-forest-800">← Zurück zum Standort</Link>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Fehlerhafte Information melden</h1>
      <p className="mt-2 text-muted">Hilf uns, das Verzeichnis aktuell zu halten. Jede Meldung wird geprüft, bevor wir etwas ändern.</p>
      <div className="mt-6"><SubmissionForm kind="report" locationId={l.id} locationName={l.name} /></div>
    </div>
  );
}
