import { CITIES, CITY_BY_ID, type City, type CityTier } from "./cities.ts";
import { dataset } from "./generate.ts";
import { resolvePosition } from "./position.ts";
import { mulberry32, shuffle } from "./rng.ts";
import { sampleSourceUrl } from "./sourceUrl.ts";
import { indexBuildings } from "./stats.ts";
import { normalizeText } from "./text.ts";
import type { Advertiser, Filters, SellerRole, SourceName } from "./types.ts";

export const CATALOG_SEED = 20261106;

export type Deal = "sale" | "rent";

export type CatalogListing = {
  id: string;
  title: string;
  deal: Deal;
  cityId: string;
  neighborhood: string;
  address: string;
  price: number;
  advertiser: Advertiser;
  seller: SellerRole;
  source: SourceName;
  sourceUrl: string;
  brokerageId: string | null;
  floor: number | null;
  areaM2: number | null;
  bedrooms: number | null;
  onBarraMap: boolean;
};

export type Brokerage = {
  id: string;
  name: string;
  cityId: string;
};

export type Catalog = {
  sample: true;
  cities: City[];
  brokerages: Brokerage[];
  listings: CatalogListing[];
  byId: Map<string, CatalogListing>;
  brokerageById: Map<string, Brokerage>;
  listingsByBrokerage: Map<string, CatalogListing[]>;
};

const SOURCES: SourceName[] = ["OLX", "Viva Real", "Zap Imóveis"];

const FIRM_FIRST = [
  "Atlântica",
  "Horizonte",
  "Vereda",
  "Ipê",
  "Planalto",
  "Brisa",
  "Leme",
  "Aurora",
  "Campo Verde",
  "Serra Clara",
];

const FIRM_LAST = ["Imóveis", "Consultoria", "Negócios", "Corretora"];

const STREETS = [
  "Rua da Amostra",
  "Avenida do Catálogo",
  "Alameda da Semente",
  "Travessa do Índice",
  "Rua das Corretoras",
  "Avenida Brasil Amostra",
];

const RANGE: Record<CityTier, Record<Deal, [number, number]>> = {
  high: { sale: [680000, 3900000], rent: [3200, 15000] },
  mid: { sale: [390000, 2100000], rent: [1800, 8200] },
  other: { sale: [270000, 1400000], rent: [1300, 6000] },
};

const KINDS = [
  { name: "Apartamento", beds: [1, 2, 3], area: [42, 98] },
  { name: "Apartamento", beds: [2, 3, 4], area: [74, 160] },
  { name: "Casa", beds: [2, 3, 4], area: [90, 240] },
  { name: "Cobertura", beds: [2, 3, 4], area: [110, 230] },
  { name: "Studio", beds: [1], area: [26, 42] },
];

export const DEAL_LABEL: Record<Deal, string> = {
  sale: "Venda",
  rent: "Aluguel",
};

function money(rng: () => number, min: number, max: number, step: number): number {
  return Math.round((min + rng() * (max - min)) / step) * step;
}

function advertiserMix(count: number): Advertiser[] {
  const unknown = Math.max(4, Math.round(count * 0.18));
  const person = Math.max(6, Math.round(count * 0.3));
  const agency = count - unknown - person;
  if (agency < 4) throw new Error(`Mix de anunciante inválido para ${count} anúncios.`);
  return [
    ...Array<Advertiser>(agency).fill("agency"),
    ...Array<Advertiser>(person).fill("person"),
    ...Array<Advertiser>(unknown).fill("unknown"),
  ];
}

function sellerMix(count: number, rng: () => number): SellerRole[] {
  const sellers: SellerRole[] = [];
  for (let index = 0; index < count; index += 1) {
    sellers.push(rng() < 0.57 ? "owner" : "unspecified");
  }
  if (!sellers.includes("owner")) sellers[0] = "owner";
  if (!sellers.includes("unspecified")) sellers[1] = "unspecified";
  return sellers;
}

function ensurePair(
  advertisers: Advertiser[],
  sellers: SellerRole[],
  advertiser: Advertiser,
  seller: SellerRole,
): void {
  if (advertisers.some((value, index) => value === advertiser && sellers[index] === seller)) return;
  const slot = advertisers.findIndex((value, index) => value === advertiser && sellers[index] !== seller);
  if (slot >= 0) sellers[slot] = seller;
}

function firmName(index: number): string {
  return `${FIRM_FIRST[index % FIRM_FIRST.length]} ${FIRM_LAST[Math.floor(index / FIRM_FIRST.length)]}`;
}

function compareListings(a: CatalogListing, b: CatalogListing): number {
  const cityA = CITY_BY_ID.get(a.cityId)?.name ?? a.cityId;
  const cityB = CITY_BY_ID.get(b.cityId)?.name ?? b.cityId;
  const byCity = cityA.localeCompare(cityB, "pt-BR");
  if (byCity !== 0) return byCity;
  const byNeighborhood = a.neighborhood.localeCompare(b.neighborhood, "pt-BR");
  if (byNeighborhood !== 0) return byNeighborhood;
  if (a.price !== b.price) return b.price - a.price;
  return a.id.localeCompare(b.id, "pt-BR");
}

function buildBrokerages(): Brokerage[] {
  const brokerages: Brokerage[] = [];
  CITIES.forEach((city, cityIndex) => {
    for (let slot = 0; slot < 4; slot += 1) {
      const index = cityIndex * 4 + slot;
      brokerages.push({
        id: `cor-${city.id}-${slot + 1}`,
        name: firmName(index),
        cityId: city.id,
      });
    }
  });
  return brokerages;
}

function buildExtras(rng: () => number): CatalogListing[] {
  const extras: CatalogListing[] = [];
  let sequence = 0;
  for (const city of CITIES) {
    const slots: { neighborhood: string; deal: Deal }[] = [];
    const salePer = city.id === "rio" ? 4 : 6;
    for (const neighborhood of city.neighborhoods) {
      for (let index = 0; index < salePer; index += 1) slots.push({ neighborhood, deal: "sale" });
      for (let index = 0; index < 3; index += 1) slots.push({ neighborhood, deal: "rent" });
    }
    if (city.id === "rio") {
      for (let index = 0; index < 18; index += 1) slots.push({ neighborhood: "Barra da Tijuca", deal: "rent" });
    }

    const advertisers = shuffle(advertiserMix(slots.length), rng);
    const sellers = sellerMix(slots.length, rng);
    ensurePair(advertisers, sellers, "unknown", "owner");
    ensurePair(advertisers, sellers, "person", "unspecified");
    ensurePair(advertisers, sellers, "agency", "owner");
    ensurePair(advertisers, sellers, "agency", "unspecified");

    slots.forEach((slot, index) => {
      const kind = KINDS[Math.floor(rng() * KINDS.length)];
      const [min, max] = RANGE[city.tier][slot.deal];
      const step = slot.deal === "rent" ? 50 : 1000;
      const price = money(rng, min, max, step);
      const bedrooms = kind.beds[Math.floor(rng() * kind.beds.length)];
      const areaM2 = Math.round(kind.area[0] + rng() * (kind.area[1] - kind.area[0]));
      const floorDraw = 1 + Math.floor(rng() * 18);
      const street = STREETS[Math.floor(rng() * STREETS.length)];
      const number = 20 + Math.floor(rng() * 1980);
      const id = `cat-${String(sequence).padStart(4, "0")}`;
      const source = SOURCES[sequence % SOURCES.length];
      sequence += 1;
      extras.push({
        id,
        title: `${kind.name} em ${slot.neighborhood}`,
        deal: slot.deal,
        cityId: city.id,
        neighborhood: slot.neighborhood,
        address: `${street}, ${number}`,
        price,
        advertiser: advertisers[index],
        seller: sellers[index],
        source,
        sourceUrl: sampleSourceUrl(source, id),
        brokerageId: null,
        floor: kind.name === "Casa" ? null : floorDraw,
        areaM2,
        bedrooms,
        onBarraMap: false,
      });
    });
  }
  return extras;
}

function attachBrokerages(listings: CatalogListing[], brokerages: Brokerage[]): void {
  const firmsByCity = new Map<string, Brokerage[]>();
  for (const brokerage of brokerages) {
    const group = firmsByCity.get(brokerage.cityId) ?? [];
    group.push(brokerage);
    firmsByCity.set(brokerage.cityId, group);
  }

  const agencyByCity = new Map<string, CatalogListing[]>();
  for (const listing of listings) {
    if (listing.advertiser !== "agency") {
      listing.brokerageId = null;
      continue;
    }
    const group = agencyByCity.get(listing.cityId) ?? [];
    group.push(listing);
    agencyByCity.set(listing.cityId, group);
  }

  for (const [cityId, group] of agencyByCity) {
    const firms = firmsByCity.get(cityId) ?? [];
    if (firms.length === 0) throw new Error(`Cidade sem corretora: ${cityId}.`);
    group.sort((a, b) => a.id.localeCompare(b.id, "pt-BR"));
    group.forEach((listing, index) => {
      listing.brokerageId = firms[index % firms.length].id;
    });
  }
}

export function buildCatalog(seed = CATALOG_SEED): Catalog {
  const buildings = indexBuildings(dataset.buildings);
  const listings: CatalogListing[] = dataset.listings.map((listing) => {
    const building = listing.buildingId ? buildings.get(listing.buildingId) : undefined;
    return {
      id: listing.id,
      title: building?.name ?? listing.address,
      deal: "sale",
      cityId: "rio",
      neighborhood: "Barra da Tijuca",
      address: listing.address,
      price: listing.price,
      advertiser: listing.advertiser,
      seller: listing.seller,
      source: listing.source,
      sourceUrl: sampleSourceUrl(listing.source, listing.id),
      brokerageId: null,
      floor: listing.floor,
      areaM2: null,
      bedrooms: null,
      onBarraMap: resolvePosition(listing, building) != null,
    };
  });

  listings.push(...buildExtras(mulberry32(seed)));
  const brokerages = buildBrokerages();
  attachBrokerages(listings, brokerages);
  listings.sort(compareListings);

  const listingsByBrokerage = new Map<string, CatalogListing[]>();
  for (const listing of listings) {
    if (!listing.brokerageId) continue;
    const group = listingsByBrokerage.get(listing.brokerageId) ?? [];
    group.push(listing);
    listingsByBrokerage.set(listing.brokerageId, group);
  }

  return {
    sample: true,
    cities: CITIES,
    brokerages,
    listings,
    byId: new Map(listings.map((listing) => [listing.id, listing])),
    brokerageById: new Map(brokerages.map((brokerage) => [brokerage.id, brokerage])),
    listingsByBrokerage,
  };
}

export const catalog = buildCatalog();

export type CatalogQuery = {
  text: string;
  cityId: string;
  sale: boolean;
  rent: boolean;
  advertiser: Filters;
  seller: Record<SellerRole, boolean>;
};

export function filterListings(query: CatalogQuery): CatalogListing[] {
  const needle = normalizeText(query.text.trim());
  return catalog.listings.filter((listing) => {
    if (query.cityId !== "all" && listing.cityId !== query.cityId) return false;
    if (listing.deal === "sale" && !query.sale) return false;
    if (listing.deal === "rent" && !query.rent) return false;
    if (!query.advertiser[listing.advertiser]) return false;
    if (!query.seller[listing.seller]) return false;
    if (!needle) return true;
    const city = CITY_BY_ID.get(listing.cityId);
    const brokerage = listing.brokerageId ? catalog.brokerageById.get(listing.brokerageId) : undefined;
    const haystack = normalizeText(
      [listing.title, listing.address, listing.neighborhood, city?.name ?? "", city?.state ?? "", brokerage?.name ?? "", listing.source].join(" "),
    );
    return haystack.includes(needle);
  });
}
