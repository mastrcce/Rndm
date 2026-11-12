"use client";

import { Heart, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { InstallButton } from "../pwa/install-button";
import { LogoMark } from "./logo";

// Bewusst schlank: weitere Seiten (Wissen, Vorschlagen, Hofprodukte) sind über die Fußzeile erreichbar
const NAV = [
  { href: "/#karte", label: "Karte" },
  { href: "/rohmilchautomaten", label: "Nach Bundesland" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    // Menü bei Seitenwechsel schließen
    setLastPath(pathname);
    setOpen(false);
  }
  if (pathname.startsWith("/admin")) return null;
  return (
    <header className="sticky top-0 z-[1100] border-b border-line/80 bg-cream-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Rohmilch-Atlas – Startseite">
          <LogoMark />
          <span className="font-display text-lg font-medium tracking-tight text-forest-900">
            Rohmilch<span className="text-sage-600">-Atlas</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Hauptnavigation">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("rounded-full px-3 py-2 text-sm text-forest-900 hover:bg-sage-100", pathname === n.href && "bg-sage-100 font-medium")}>
              {n.label}
            </Link>
          ))}
          <Link href="/favoriten" className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-2 text-sm text-forest-900 hover:border-sage-400">
            <Heart className="size-4" /> Favoriten
          </Link>
        </nav>
        <button className="rounded-full p-2 text-forest-900 hover:bg-sage-100 md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menü">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-line bg-cream-50 px-4 py-3 transition-[opacity,transform] duration-200 ease-out starting:opacity-0 motion-safe:starting:-translate-y-1 md:hidden" aria-label="Mobile Navigation">
          {[...NAV, { href: "/favoriten", label: "Favoriten" }].map((n) => (
            <Link key={n.href} href={n.href} className="block rounded-2xl px-3 py-3 text-forest-900 hover:bg-sage-100">
              {n.label}
            </Link>
          ))}
          <InstallButton variant="primary" className="mt-2 w-full" />
        </nav>
      )}
    </header>
  );
}
