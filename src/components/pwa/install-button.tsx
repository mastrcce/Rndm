"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { cn } from "@/lib/utils";

/** Knopf „App installieren“. Wird ausgeblendet, wenn die App bereits installiert läuft. */
export function InstallButton({ className, variant = "secondary" }: { className?: string; variant?: "secondary" | "primary" | "ghost" }) {
  const { canPrompt, install, standalone, ios } = useInstallPrompt();
  const [showIos, setShowIos] = useState(false);
  const pathname = usePathname();
  if (standalone) return null;
  if (!canPrompt && !ios) {
    // Auf der Anleitungsseite selbst kein Link auf sich selbst
    if (pathname === "/app") return null;
    return (
      <Button asChild variant={variant} className={className}>
        <Link href="/app"><Download /> Als App nutzen</Link>
      </Button>
    );
  }
  return (
    <>
      <Button variant={variant} className={className} onClick={() => (canPrompt ? install() : setShowIos(true))}>
        <Download /> App installieren
      </Button>
      {showIos && <IosInstructions onClose={() => setShowIos(false)} />}
    </>
  );
}

export function IosInstructions({ onClose, inline = false }: { onClose?: () => void; inline?: boolean }) {
  const steps = (
    <ol className="space-y-3 text-sm">
      <li className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sage-100 font-semibold text-forest-900">1</span>
        <span>Tippe in Safari unten auf <strong>Teilen</strong> <Share className="inline size-4 align-text-bottom" aria-label="Teilen-Symbol" />.</span>
      </li>
      <li className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sage-100 font-semibold text-forest-900">2</span>
        <span>Wähle <strong>Zum Home-Bildschirm</strong> <SquarePlus className="inline size-4 align-text-bottom" aria-hidden /> (ggf. etwas nach unten scrollen).</span>
      </li>
      <li className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sage-100 font-semibold text-forest-900">3</span>
        <span>Tippe auf <strong>Hinzufügen</strong>. Der Rohmilch-Atlas erscheint als App-Symbol.</span>
      </li>
    </ol>
  );
  if (inline) return steps;
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="ios-install-title" onClick={onClose}>
      <div className={cn("w-full max-w-sm rounded-xl2 bg-white p-5 shadow-lift")} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 id="ios-install-title" className="text-xl font-semibold">Auf dem iPhone installieren</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-sage-100" aria-label="Schließen"><X className="size-5" /></button>
        </div>
        <div className="mt-4">{steps}</div>
      </div>
    </div>
  );
}
