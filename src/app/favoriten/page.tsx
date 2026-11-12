import type { Metadata } from "next";
import { FavoritesList } from "./favorites-list";

export const metadata: Metadata = { title: "Meine Favoriten", robots: { index: false } };

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold sm:text-5xl">Meine Favoriten</h1>
      <p className="mt-3 text-muted">Deine gemerkten Standorte werden nur in diesem Browser gespeichert – ohne Konto und ohne Übertragung an uns.</p>
      <div className="mt-8"><FavoritesList /></div>
    </div>
  );
}
