import { catalog } from "./catalog.ts";
import { CITIES } from "./cities.ts";
import { dataset } from "./generate.ts";
import { priceIndex } from "./priceIndex.ts";
import { computeStats, indexBuildings, listingsFor } from "./stats.ts";
import { ADVERTISER_KEYS, SELLER_KEYS, type Filters } from "./types.ts";

const buildings = indexBuildings(dataset.buildings);
const full = computeStats(dataset.listings, buildings);
const cases: [string, Filters][] = [
  ["imobiliária", { agency: true, person: false, unknown: false }],
  ["pessoa física", { agency: false, person: true, unknown: false }],
  ["não identificado", { agency: false, person: false, unknown: true }],
  ["sem imobiliária", { agency: false, person: true, unknown: true }],
];

let failed = false;
for (const [label, filters] of cases) {
  const stats = computeStats(listingsFor(dataset, filters), buildings);
  console.log(label, stats);
  if (stats.imoveis <= 0 || stats.pontos <= 0 || stats.imoveis >= full.imoveis || stats.pontos >= full.pontos) {
    console.error(`Filtro "${label}" não alterou os totais de forma útil.`);
    failed = true;
  }
}

console.log("todos os filtros", full);

const owners = dataset.listings.filter((listing) => listing.seller === "owner").length;
const unspecified = dataset.listings.length - owners;
if (owners <= 0 || unspecified <= 0) {
  console.error("A amostra da Barra não separou proprietário e não informado.");
  failed = true;
}
const divergent =
  dataset.listings.some((listing) => listing.advertiser === "unknown" && listing.seller === "owner") &&
  dataset.listings.some((listing) => listing.advertiser === "person" && listing.seller === "unspecified") &&
  dataset.listings.some((listing) => listing.advertiser === "agency" && listing.seller === "unspecified");
if (!divergent) {
  console.error("Anunciante e vendedor ficaram presos um no outro na amostra da Barra.");
  failed = true;
}

const mirrored = catalog.byId.get(dataset.listings[0].id);
const first = dataset.listings[0];
if (
  !mirrored ||
  mirrored.price !== first.price ||
  mirrored.advertiser !== first.advertiser ||
  mirrored.seller !== first.seller ||
  mirrored.deal !== "sale" ||
  mirrored.cityId !== "rio" ||
  mirrored.neighborhood !== "Barra da Tijuca" ||
  !mirrored.onBarraMap
) {
  console.error("O anúncio da Barra não bate com a lista nacional.");
  failed = true;
}

const mapRows = catalog.listings.filter((listing) => listing.id.startsWith("im-"));
if (mapRows.length !== dataset.listings.length) {
  console.error(`A lista nacional espelhou ${mapRows.length} anúncios da Barra.`);
  failed = true;
}

if (catalog.brokerages.length !== CITIES.length * 4) {
  console.error(`Corretoras: ${catalog.brokerages.length}.`);
  failed = true;
}
if (new Set(catalog.brokerages.map((brokerage) => brokerage.name)).size !== catalog.brokerages.length) {
  console.error("Há corretoras com o mesmo nome.");
  failed = true;
}

for (const city of CITIES) {
  const rows = catalog.listings.filter((listing) => listing.cityId === city.id);
  const sale = rows.some((listing) => listing.deal === "sale");
  const rent = rows.some((listing) => listing.deal === "rent");
  const advertisers = ADVERTISER_KEYS.every((key) => rows.some((listing) => listing.advertiser === key));
  const sellers = SELLER_KEYS.every((key) => rows.some((listing) => listing.seller === key));
  const split =
    rows.some((listing) => listing.advertiser === "unknown" && listing.seller === "owner") &&
    rows.some((listing) => listing.advertiser === "person" && listing.seller === "unspecified");
  if (!sale || !rent || !advertisers || !sellers || !split) {
    console.error(`Cobertura incompleta em ${city.name}.`, { sale, rent, advertisers, sellers, split, total: rows.length });
    failed = true;
  }
}

for (const brokerage of catalog.brokerages) {
  const rows = catalog.listingsByBrokerage.get(brokerage.id) ?? [];
  if (rows.length === 0 || rows.some((listing) => listing.cityId !== brokerage.cityId || listing.advertiser !== "agency")) {
    console.error(`Corretora sem anúncios coerentes: ${brokerage.name}.`);
    failed = true;
  }
}

for (const listing of catalog.listings) {
  const agency = listing.advertiser === "agency";
  if (agency === !listing.brokerageId) {
    console.error(`Vínculo de corretora inesperado em ${listing.id}.`);
    failed = true;
    break;
  }
  let url: URL;
  try {
    url = new URL(listing.sourceUrl);
  } catch {
    console.error(`URL inválida em ${listing.id}.`);
    failed = true;
    break;
  }
  if (url.protocol !== "https:" || url.hostname !== "amostra.example" || !url.pathname.endsWith(`/${listing.id}`)) {
    console.error(`URL de amostra recusada em ${listing.id}: ${listing.sourceUrl}`);
    failed = true;
    break;
  }
}

const seriesList = [priceIndex.national, ...priceIndex.cities];
if (priceIndex.cities.length !== CITIES.length || priceIndex.national.points.length !== 130) {
  console.error("Série do índice com tamanho inesperado.");
  failed = true;
}
const firstPoint = priceIndex.national.points[0];
const lastPoint = priceIndex.national.points[priceIndex.national.points.length - 1];
if (firstPoint.level !== 100 || firstPoint.year !== 2016 || firstPoint.month !== 1 || lastPoint.year !== 2026 || lastPoint.month !== 10) {
  console.error("Período do índice fora de jan/2016 a out/2026.");
  failed = true;
}
for (const series of seriesList) {
  const levels = series.points.map((point) => point.level);
  const yoy = levels[levels.length - 1] / levels[levels.length - 13] - 1;
  const sane = levels.every((level) => Number.isFinite(level) && level > 80 && level < 280);
  if (series.points.length !== 130 || !sane || Math.abs(yoy - series.yoy) > 1e-9 || Math.abs(series.yoy) > 0.4) {
    console.error(`Série inválida: ${series.label}`, series.latest, series.yoy);
    failed = true;
  }
}

console.log(
  "catálogo",
  catalog.listings.length,
  "corretoras",
  catalog.brokerages.length,
  "índice",
  priceIndex.national.latest.toFixed(1),
  "12m",
  priceIndex.national.yoy.toFixed(3),
);

if (failed) process.exit(1);
