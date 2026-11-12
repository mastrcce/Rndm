import type { Metadata } from "next";
import { SubmissionForm } from "@/components/forms/submission-form";

export const metadata: Metadata = {
  title: "Neuen Rohmilch-Standort vorschlagen",
  description: "Du kennst einen Milchautomaten oder Hofladen mit Rohmilch, der noch fehlt? Schlage ihn vor – wir prüfen jeden Eintrag.",
  alternates: { canonical: "/standort-vorschlagen" },
};

export default function SuggestPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold sm:text-5xl">Standort vorschlagen</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Du kennst einen Rohmilchautomaten, einen Hofladen oder Bauernhof mit Milchverkauf, der hier noch fehlt?
        Teile ihn mit uns. Jeder Vorschlag wird vor der Veröffentlichung geprüft.
      </p>
      <div className="mt-8"><SubmissionForm kind="suggestion" /></div>
    </div>
  );
}
