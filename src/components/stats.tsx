import type { Stats } from "@/lib/types";

export function StatsGrid({ stats }: { stats: Stats }) {
  const items = [
    { value: stats.vending, label: "Milch- & Verkaufsautomaten" },
    { value: stats.total, label: "Verkaufsstellen insgesamt" },
    { value: stats.farms, label: "Bauernhöfe & Hofläden" },
    { value: stats.states, label: "Bundesländer vertreten" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl2 border border-line bg-white/80 px-4 py-4 shadow-soft backdrop-blur sm:px-5">
          <dt className="text-xs font-medium text-muted sm:text-sm">{i.label}</dt>
          <dd className="mt-1 font-display text-3xl font-semibold tabular-nums text-forest-900 sm:text-4xl">
            {i.value.toLocaleString("de-DE")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
