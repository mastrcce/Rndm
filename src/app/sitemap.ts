import type { MetadataRoute } from "next";
import { getAllSlugs, getTopCities } from "@/lib/locations";
import { safe } from "@/lib/server/safe";
import { STATES } from "@/lib/states";
import { siteUrl } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ data: slugs }, { data: cities }] = await Promise.all([safe(getAllSlugs, []), safe(() => getTopCities(5000, 1), [])]);
  const now = new Date();
  return [
    { url: siteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/rohmilchautomaten"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...STATES.map((s) => ({ url: siteUrl(`/rohmilchautomaten/${s.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...cities.map((c) => ({ url: siteUrl(`/rohmilch-in-${c.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...slugs.map((s) => ({ url: siteUrl(`/standort/${s.slug}`), lastModified: s.updated_at, changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: siteUrl("/rohmilch"), changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/datenquellen"), changeFrequency: "monthly", priority: 0.3 },
    { url: siteUrl("/standort-vorschlagen"), changeFrequency: "monthly", priority: 0.3 },
  ];
}
