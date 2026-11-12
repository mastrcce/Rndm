"use client";

import { Check, Flag, Heart, PencilLine, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

export function LocationActions({ id, slug, name }: { id: string; slug: string; name: string }) {
  const fav = useFavorites();
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text: `${name} – Rohmilch-Finder`, url });
        return;
      } catch {
        /* abgebrochen */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Link kopieren:", url);
    }
  }
  const isFav = fav.has(id);
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant={isFav ? "primary" : "secondary"} onClick={() => fav.toggle(id)} aria-pressed={isFav}>
        <Heart className={cn(isFav && "fill-current")} /> {isFav ? "Gemerkt" : "Merken"}
      </Button>
      <Button variant="secondary" onClick={share}>
        {copied ? <Check /> : <Share2 />} {copied ? "Link kopiert" : "Teilen"}
      </Button>
      <Button variant="ghost" asChild>
        <Link href={`/standort/${slug}/ergaenzen`}><PencilLine /> Infos ergänzen</Link>
      </Button>
      <Button variant="ghost" asChild>
        <Link href={`/standort/${slug}/melden`}><Flag /> Fehler melden</Link>
      </Button>
    </div>
  );
}
