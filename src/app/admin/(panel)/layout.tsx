import { ClipboardList, Copy, Database, LayoutDashboard, LogOut, MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logout } from "../actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard },
  { href: "/admin/standorte", label: "Standorte", icon: MapPin },
  { href: "/admin/standorte/neu", label: "Neuer Standort", icon: Plus },
  { href: "/admin/meldungen", label: "Moderation", icon: ClipboardList },
  { href: "/admin/dubletten", label: "Dubletten", icon: Copy },
  { href: "/admin/importe", label: "Importe & Quellen", icon: Database },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Link href="/" className="font-display text-lg font-semibold text-forest-900">Rohmilch-Finder</Link>
        <p className="text-xs uppercase tracking-widest text-sage-600">Administration</p>
        <nav className="mt-4 flex gap-1 overflow-x-auto lg:flex-col" aria-label="Admin-Navigation">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm text-forest-900 hover:bg-sage-100">
              <Icon className="size-4 text-sage-600" /> {label}
            </Link>
          ))}
          <form action={logout}>
            <button className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-sage-100">
              <LogOut className="size-4" /> Abmelden
            </button>
          </form>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
