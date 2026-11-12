import { BadgeCheck, ExternalLink, Globe, Info, Mail, MapPin, Navigation, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DistanceToUser } from "@/components/location/distance-to-user";
import { LocationActions } from "@/components/location/location-actions";
import { LocationImage } from "@/components/location/location-image";
import { MiniMapClient } from "@/components/location/mini-map-client";
import { OpeningHoursView } from "@/components/location/opening-hours-view";
import { SafetyNotice } from "@/components/safety-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/category-icon";
import {
  CATEGORY_LABELS,
  CATEGORY_SLUGS,
  LOCATION_TYPE_DESCRIPTIONS,
  LOCATION_TYPE_LABELS,
  RAW_MILK_LABELS,
  SALES_TYPE_LABELS,
  paymentLabel,
  productLabel,
} from "@/lib/categories";
import { formatDistance } from "@/lib/geo";
import { getLocationBySlug, getNearby } from "@/lib/locations";
import { stateByName } from "@/lib/states";
import type { LocationDetail } from "@/lib/types";
import { formatDate, formatPrice, navigationLinks, siteUrl } from "@/lib/utils";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

/** Seiten werden beim ersten Aufruf erzeugt und danach zwischengespeichert (ISR). */
export async function generateStaticParams() {
  return [];
}

function describe(l: LocationDetail): string {
  const where = l.city ? ` in ${l.city}` : l.state ? ` in ${l.state}` : "";
  const parts = [`${LOCATION_TYPE_LABELS[l.locationType]}${where}`];
  if (l.address) parts.push(`${l.address}${l.postalCode || l.city ? `, ${[l.postalCode, l.city].filter(Boolean).join(" ")}` : ""}`);
  if (l.openingHours) parts.push(`Öffnungszeiten: ${l.openingHours}`);
  parts.push(`Angebot: ${l.categories.map((c) => CATEGORY_LABELS[c]).join(", ")}`);
  if (l.categories.includes("milk") && l.rawMilkStatus === "confirmed") parts.push("Rohmilch laut Quelle bestätigt");
  return `${l.name}: ${parts.join(" · ")}. Adresse, Öffnungszeiten und Navigation.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = await getLocationBySlug(slug).catch(() => null);
  if (!l) return { title: "Standort nicht gefunden", robots: { index: false } };
  const title = `${l.name} – ${LOCATION_TYPE_LABELS[l.locationType]}${l.city && !l.name.includes(l.city) ? ` in ${l.city}` : ""}`;
  return {
    title,
    description: describe(l).slice(0, 160),
    alternates: { canonical: `/standort/${l.slug}` },
    robots: l.isActive ? undefined : { index: false, follow: true },
    openGraph: { title, description: describe(l).slice(0, 200), url: `/standort/${l.slug}`, type: "website", images: l.imageUrl ? [l.imageUrl] : undefined },
  };
}

function Row({ label, children, icon: Icon }: { label: string; children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="grid gap-1 border-b border-line py-3.5 last:border-0 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="flex items-center gap-2 text-sm font-medium text-muted">
        {Icon && <Icon className="size-4 text-sage-600" aria-hidden />} {label}
      </dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}

const NA = <span className="text-muted">Keine Angabe</span>;

function jsonLd(l: LocationDetail) {
  const simpleHours = l.openingHours && /^[A-Za-z0-9 ,:\-;/]+$/.test(l.openingHours) && !/PH|SH|off|"|\(/.test(l.openingHours);
  return {
    "@context": "https://schema.org",
    "@type": l.locationType === "farm_shop" || l.locationType === "farm" ? "Store" : "LocalBusiness",
    name: l.name,
    url: siteUrl(`/standort/${l.slug}`),
    ...(l.imageUrl ? { image: l.imageUrl } : {}),
    ...(l.phone ? { telephone: l.phone } : {}),
    ...(l.address || l.city
      ? {
          address: {
            "@type": "PostalAddress",
            ...(l.address ? { streetAddress: l.address } : {}),
            ...(l.postalCode ? { postalCode: l.postalCode } : {}),
            ...(l.city ? { addressLocality: l.city } : {}),
            ...(l.state ? { addressRegion: l.state } : {}),
            addressCountry: "DE",
          },
        }
      : {}),
    geo: { "@type": "GeoCoordinates", latitude: l.latitude, longitude: l.longitude },
    ...(simpleHours ? { openingHours: l.openingHours === "24/7" ? "Mo-Su 00:00-23:59" : l.openingHours!.split(/;\s*/) } : {}),
    ...(l.paymentMethods.length ? { paymentAccepted: l.paymentMethods.map(paymentLabel).join(", ") } : {}),
    ...(l.website ? { sameAs: [l.website] } : {}),
  };
}

export default async function LocationPage({ params }: Props) {
  const { slug } = await params;
  const l = await getLocationBySlug(slug);
  if (!l) notFound();
  const nearby = await getNearby(l.latitude, l.longitude, 25, 6, l.id).catch(() => []);
  const nav = navigationLinks(l.latitude, l.longitude, l.name);
  const state = stateByName(l.state);
  const cityLine = [l.postalCode, l.city].filter(Boolean).join(" ");
  const verified = formatDate(l.lastVerifiedAt);
  // Brotkrumen: Milch-Seiten oder Seite des ersten Produkts
  const crumbCat = l.categories.includes("milk") ? "milk" : l.categories[0] ?? "milk";
  const crumbBase = CATEGORY_SLUGS[crumbCat];
  const crumbLabel = crumbCat === "milk" ? "Rohmilchautomaten" : CATEGORY_LABELS[crumbCat];

  return (
    <article className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(l)) }} />
      <nav aria-label="Brotkrumen" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-forest-800">Start</Link></li>
          <li aria-hidden>/</li>
          <li><Link href={`/${crumbBase}`} className="hover:text-forest-800">{crumbLabel}</Link></li>
          {state && (<><li aria-hidden>/</li><li><Link href={`/${crumbBase}/${state.slug}`} className="hover:text-forest-800">{state.name}</Link></li></>)}
          <li aria-hidden>/</li>
          <li className="truncate text-forest-900" aria-current="page">{l.name}</li>
        </ol>
      </nav>

      {!l.isActive && (
        <p className="mt-4 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn-fg">
          Dieser Standort ist in unseren Datenquellen nicht mehr enthalten und möglicherweise geschlossen.
        </p>
      )}

      <header className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="solid">{LOCATION_TYPE_LABELS[l.locationType]}</Badge>
            {l.categories.map((c) => (
              <Badge key={c}><CategoryIcon category={c} className="size-3" /> {CATEGORY_LABELS[c]}</Badge>
            ))}
            {l.categories.includes("milk") && (l.rawMilkStatus === "confirmed" ? (
              <Badge variant="success"><BadgeCheck /> {RAW_MILK_LABELS.confirmed}</Badge>
            ) : (
              <Badge variant="outline">{RAW_MILK_LABELS[l.rawMilkStatus]}</Badge>
            ))}
            {l.organicStatus && <Badge>{l.organicStatus === "verified" ? "Bio (geprüft)" : `Bio laut Quelle${l.organicLabel ? ` · ${l.organicLabel}` : ""}`}</Badge>}
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">{l.name}</h1>
          {l.nameIsGenerated && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <Info className="size-4" aria-hidden /> Die Quelle nennt keinen Namen – die Bezeichnung wurde aus Art und Lage abgeleitet.
            </p>
          )}
          <p className="mt-3 flex items-start gap-2 text-lg text-muted">
            <MapPin className="mt-1 size-5 shrink-0 text-sage-600" aria-hidden />
            <span>{[l.address, cityLine].filter(Boolean).join(", ") || "Adresse: Keine Angabe"}{l.state ? ` · ${l.state}` : ""}</span>
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="lg"><a href={nav.google} target="_blank" rel="noopener noreferrer"><Navigation /> Route mit Google Maps</a></Button>
            <Button asChild size="lg" variant="secondary"><a href={nav.apple} target="_blank" rel="noopener noreferrer">Apple Karten</a></Button>
          </div>
          <div className="mt-4"><LocationActions id={l.id} slug={l.slug} name={l.name} /></div>
        </div>
        <div className="overflow-hidden rounded-xl2 border border-line shadow-soft">
          {l.imageUrl && <LocationImage src={l.imageUrl} alt={`Foto: ${l.name}`} />}
          <MiniMapClient lat={l.latitude} lon={l.longitude} type={l.locationType} confirmed={l.rawMilkStatus === "confirmed" && l.categories.includes("milk")} className="h-64 w-full lg:h-72" />
        </div>
      </header>

      {l.categories.includes("milk") && <SafetyNotice className="mt-8" compact />}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="details" className="rounded-xl2 border border-line bg-white px-5 py-2 shadow-soft sm:px-7">
          <h2 id="details" className="sr-only">Details</h2>
          <dl>
            <Row label="Name des Betriebs">{l.nameIsGenerated ? NA : l.name}</Row>
            <Row label="Adresse" icon={MapPin}>
              {l.address || cityLine ? <>{l.address && <>{l.address}<br /></>}{cityLine}{cityLine && <br />}{l.state}, Deutschland</> : NA}
            </Row>
            <Row label="GPS-Koordinaten">
              <span className="font-mono">{l.latitude.toFixed(6)}, {l.longitude.toFixed(6)}</span>
            </Row>
            <Row label="Telefon" icon={Phone}>{l.phone ? <a className="text-forest-800 underline" href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}>{l.phone}</a> : NA}</Row>
            <Row label="Website" icon={Globe}>
              {l.website ? <a className="break-all text-forest-800 underline" href={l.website} target="_blank" rel="noopener noreferrer nofollow">{l.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a> : NA}
            </Row>
            {l.email && <Row label="E-Mail" icon={Mail}><a className="text-forest-800 underline" href={`mailto:${l.email}`}>{l.email}</a></Row>}
            <Row label="Öffnungszeiten">
              <OpeningHoursView value={l.openingHours} lat={l.latitude} lon={l.longitude} state={l.state} />
            </Row>
            <Row label="Art des Verkaufs">
              {LOCATION_TYPE_DESCRIPTIONS[l.locationType]}
              {l.salesTypes.length > 0 && <span className="text-muted"> · {l.salesTypes.map((s) => SALES_TYPE_LABELS[s] ?? s).join(", ")}</span>}
            </Row>
            <Row label="Produkte">
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                {l.categories.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5"><CategoryIcon category={c} className="size-4 text-sage-600" /> {CATEGORY_LABELS[c]}</span>
                ))}
              </span>
              <span className="block text-xs text-muted">Laut Datenquelle. Ob die Produkte aktuell vorrätig sind, können wir nicht prüfen.</span>
            </Row>
            <Row label="Verfügbarkeit von Rohmilch">
              {!l.categories.includes("milk") ? (
                <span className="text-muted">Kein Milchverkauf angegeben</span>
              ) : l.rawMilkStatus === "confirmed" ? (
                <span className="text-emerald-800">Die Datenquelle gibt ausdrücklich Rohmilch an.</span>
              ) : (
                <span>Milchverkauf ist angegeben, Rohmilch wird aber nicht ausdrücklich bestätigt.</span>
              )}
            </Row>
            <Row label="Angebot laut Quelle">{l.products.length ? l.products.map(productLabel).join(", ") : NA}</Row>
            {l.categories.includes("milk") && <Row label="Milchpreis pro Liter">{formatPrice(l.pricePerLiter) ?? NA}</Row>}
            <Row label="Zahlungsarten">{l.paymentMethods.length ? l.paymentMethods.map(paymentLabel).join(", ") : NA}</Row>
            <Row label="Beschreibung">{l.description ?? NA}</Row>
            <Row label="Besondere Hinweise">{l.notes ?? NA}</Row>
            <Row label="Entfernung"><DistanceToUser lat={l.latitude} lon={l.longitude} /></Row>
            <Row label="Navigation" icon={Navigation}>
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                <a className="text-forest-800 underline" href={nav.google} target="_blank" rel="noopener noreferrer">Google Maps</a>
                <a className="text-forest-800 underline" href={nav.apple} target="_blank" rel="noopener noreferrer">Apple Karten</a>
                <a className="text-forest-800 underline" href={nav.osm} target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
              </span>
            </Row>
          </dl>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl2 border border-line bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Herkunft der Daten</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {l.sources.map((s) => (
                <li key={`${s.source}-${s.sourceId}`} className="rounded-xl bg-cream-50 p-3">
                  <p className="font-medium text-forest-900">{s.sourceName}</p>
                  {s.sourceUrl ? (
                    <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-forest-800 underline">
                      {s.sourceId} <ExternalLink className="size-3" />
                    </a>
                  ) : <p className="text-xs text-muted">{s.sourceId}</p>}
                  {s.license && <p className="mt-1 text-xs text-muted">Lizenz: {s.license}</p>}
                  {s.isStale && <p className="mt-1 text-xs text-warn-fg">In der Quelle nicht mehr enthalten</p>}
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-muted">Zuletzt geprüft (Quelle)</dt><dd>{verified ?? "Keine Angabe"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Letzter Datenabgleich</dt><dd>{formatDate(l.lastImportedAt) ?? "Keine Angabe"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Datensatz geändert</dt><dd>{formatDate(l.updatedAt)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Vollständigkeit</dt><dd>{l.dataQualityScore} / 100</dd></div>
            </dl>
            {l.source === "osm" && (
              <p className="mt-4 text-xs leading-relaxed text-muted">
                Angaben falsch? Du kannst sie direkt in <a className="underline" href={l.sourceUrl ?? "https://www.openstreetmap.org"} target="_blank" rel="noopener noreferrer">OpenStreetMap</a> korrigieren oder uns über „Fehler melden“ informieren.
              </p>
            )}
          </section>

          {nearby.length > 0 && (
            <section className="rounded-xl2 border border-line bg-white p-5 shadow-soft">
              <h2 className="text-lg font-semibold">In der Nähe</h2>
              <ul className="mt-3 divide-y divide-line">
                {nearby.map((n) => (
                  <li key={n.id} className="py-2.5">
                    <Link href={`/standort/${n.slug}`} className="font-medium text-forest-900 hover:underline">{n.name}</Link>
                    <p className="text-xs text-muted">{LOCATION_TYPE_LABELS[n.type]} · {formatDistance(n.distance)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
