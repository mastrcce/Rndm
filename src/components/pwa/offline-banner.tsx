"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/use-online";

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="sticky top-16 z-[1050] flex items-center justify-center gap-2 bg-forest-900 px-4 py-2 text-center text-sm text-cream-50">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      Du bist offline. Angezeigt werden die zuletzt geladenen Daten – sie können veraltet sein.
    </div>
  );
}
