import { LocationForm } from "@/components/admin/location-form";
import { createLocation } from "../../../actions";

export const metadata = { title: "Neuer Standort" };

export default function NewLocationPage() {
  return (
    <div>
      <h1 className="text-3xl font-medium">Neuen Standort anlegen</h1>
      <p className="mt-1 text-sm text-muted">Nur geprüfte Angaben eintragen. Koordinaten z. B. aus OpenStreetMap übernehmen (Rechtsklick → „Adresse anzeigen“).</p>
      <div className="mt-6"><LocationForm action={createLocation} submitLabel="Anlegen" /></div>
    </div>
  );
}
