"use client";

import { useNow } from "@/hooks/use-minute-clock";
import { isOpenAt, nextChange, weekTable } from "@/lib/opening-hours";

export function OpeningHoursView({ value, lat, lon, state }: { value: string | null; lat: number; lon: number; state: string | null }) {
  const now = useNow();
  if (!value) return <span className="text-muted">Keine Angabe</span>;
  const ctx = { lat, lon, state };
  const table = now ? weekTable(value, ctx, now) : null;
  const open = now ? isOpenAt(value, ctx, now) : null;
  const next = now ? nextChange(value, ctx, now) : null;
  const todayIdx = now ? (now.getDay() + 6) % 7 : -1;
  return (
    <div>
      {now && open !== null && (
        <p className="mb-2 text-sm">
          <span className={open ? "font-semibold text-emerald-800" : "font-semibold text-warn-fg"}>
            {open ? "Laut Angabe jetzt geöffnet" : "Laut Angabe jetzt geschlossen"}
          </span>
          {next && value !== "24/7" && (
            <span className="text-muted">
              {" "}· {open ? "schließt" : "öffnet"} {next.toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </p>
      )}
      {table ? (
        <table className="w-full max-w-sm text-sm">
          <tbody>
            {table.map((r, i) => (
              <tr key={r.day} className={i === todayIdx ? "font-semibold text-forest-900" : "text-ink"}>
                <td className="py-0.5 pr-4">{r.day}</td>
                <td className="py-0.5">{r.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm">{value}</p>
      )}
      <p className="mt-2 text-xs text-muted">
        Originalangabe: „{value}“ · ohne Gewähr, nicht vor Ort geprüft.
      </p>
    </div>
  );
}
