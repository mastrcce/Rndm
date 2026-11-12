"use client";

import { Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PlaceResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useFinder } from "./finder-context";

export function SearchBox({ size = "lg", scrollToMap = true }: { size?: "lg" | "md"; scrollToMap?: boolean }) {
  const { choosePlace, locate, locating, locateError, origin, setOrigin } = useFinder();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const listId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function lookup(term: string): Promise<PlaceResult[]> {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(true);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
      const j = (await r.json()) as { results: PlaceResult[] };
      return j.results ?? [];
    } catch {
      return [];
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onInput(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const r = await lookup(value);
      setResults(r);
      setActive(0);
      setOpen(true);
    }, 220);
  }

  function scroll() {
    if (scrollToMap) document.getElementById("karte")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function pick(p: PlaceResult) {
    choosePlace(p);
    setQ(p.label);
    setOpen(false);
    setMessage(null);
    scroll();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (results[active]) return pick(results[active]);
    if (q.trim().length < 2) return;
    const r = await lookup(q);
    if (r[0]) pick(r[0]);
    else setMessage(`Kein Ort zu „${q}“ gefunden. Versuche eine Postleitzahl oder einen größeren Ort.`);
  }

  const big = size === "lg";
  return (
    <div className="w-full">
      <form onSubmit={submit} role="search" className="relative">
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border border-line bg-white pl-4 shadow-soft focus-within:border-sage-500 focus-within:ring-4 focus-within:ring-sage-200/60",
            big ? "h-14 pr-1.5 sm:h-16" : "h-12 pr-1",
          )}
        >
          <Search className="size-5 shrink-0 text-sage-600" aria-hidden />
          <input
            type="text"
            inputMode="search"
            autoComplete="off"
            value={q}
            onChange={(e) => onInput(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (!open || !results.length) return;
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Stadt, Postleitzahl oder Adresse"
            aria-label="Ort, Postleitzahl oder Adresse suchen"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            className={cn("min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted/70 focus:outline-none", big ? "text-base sm:text-lg" : "text-sm")}
          />
          {busy && <Loader2 className="size-4 animate-spin text-muted" aria-hidden />}
          {q && !busy && (
            <button type="button" onClick={() => { setQ(""); setResults([]); }} className="rounded-full p-1 text-muted hover:bg-sage-100" aria-label="Eingabe löschen">
              <X className="size-4" />
            </button>
          )}
          <Button type="submit" size={big ? "lg" : "md"} className={cn(big && "h-11 sm:h-13 sm:px-7")}>
            Suchen
          </Button>
        </div>
        {open && results.length > 0 && (
          <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-[1200] mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
            {results.map((r, i) => (
              <li key={`${r.kind}-${r.label}-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(r)}
                  onMouseEnter={() => setActive(i)}
                  className={cn("flex w-full items-center gap-3 px-4 py-3 text-left text-sm", i === active && "bg-sage-100")}
                >
                  <MapPin className="size-4 shrink-0 text-sage-600" aria-hidden />
                  <span className="flex-1 text-ink">{r.label}</span>
                  <span className="text-xs text-muted">
                    {r.kind === "postal_code" ? "PLZ" : r.kind === "state" ? "Bundesland" : r.kind === "city" ? "Ort" : "Adresse"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Button type="button" variant="secondary" onClick={() => { locate(); scroll(); }} disabled={locating}>
          {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
          Standort verwenden
        </Button>
        {origin && (
          <span className="inline-flex items-center gap-1 text-muted">
            Bezugspunkt: <strong className="font-medium text-forest-900">{origin.label}</strong>
            <button type="button" className="ml-1 rounded-full p-0.5 hover:bg-sage-100" onClick={() => setOrigin(null)} aria-label="Bezugspunkt entfernen">
              <X className="size-3.5" />
            </button>
          </span>
        )}
      </div>
      {(message || locateError) && <p className="mt-2 text-sm text-warn-fg" role="status">{message ?? locateError}</p>}
    </div>
  );
}
