import { BOUNDS } from "./geo.ts";
import { resolvePosition } from "./position.ts";
import { mulberry32 } from "./rng.ts";
import { sampleSpot } from "./streets.ts";
import { computeStats, indexBuildings } from "./stats.ts";
import type { Advertiser, Building, Dataset, Listing, SourceName } from "./types.ts";

const TOTAL_LISTINGS = 4689;
const TOTAL_BUILDINGS = 1016;
const POSITIONED_BUILDINGS = 666;
const WITH_FLOOR = 930;
const NO_COORD = 2281;
const MAP_POINTS = 2488;

const WITH_COORD = TOTAL_LISTINGS - NO_COORD;
const INHERIT = MAP_POINTS - WITH_COORD;
const UNPOSITIONED = TOTAL_BUILDINGS - POSITIONED_BUILDINGS;

const SOURCES: SourceName[] = ["OLX", "Viva Real", "Zap Imóveis"];
const STACKS: number[][] = [[], [6], [4, 12], [3, 9, 16], [2, 8, 14, 22]];

const PREFIX = ["Edifício", "Residencial", "Condomínio", "Torre"];
const NAME_A = [
  "Horizonte",
  "Atlântico",
  "Lagoa",
  "Península",
  "Costa",
  "Jardim",
  "Solar",
  "Parque",
  "Vista",
  "Mar",
  "Bosque",
  "Recanto",
];
const NAME_B = [
  "Azul",
  "da Barra",
  "das Américas",
  "Oceânico",
  "do Sol",
  "Verde",
  "Real",
  "Imperial",
  "Nobre",
  "Sul",
  "da Tijuca",
  "Dourado",
];

function floorPlan(): number[] {
  const groups: [number, number][] = [
    [80, 4],
    [100, 3],
    [110, 2],
    [90, 1],
  ];
  const plan: number[] = [];
  for (const [buildings, floors] of groups) {
    for (let index = 0; index < buildings; index += 1) plan.push(floors);
  }
  const listings = plan.reduce((sum, floors) => sum + floors, 0);
  if (listings !== WITH_FLOOR) {
    throw new Error(`Plano de andares gerou ${listings}, esperado ${WITH_FLOOR}.`);
  }
  return plan;
}

function buildingName(index: number): string {
  const prefix = PREFIX[index % PREFIX.length];
  const first = NAME_A[index % NAME_A.length];
  const second = NAME_B[Math.floor(index / NAME_A.length) % NAME_B.length];
  return `${prefix} ${first} ${second}`;
}

function priceFor(rng: () => number, floor: number | null, house: boolean): number {
  const raw = floor != null
    ? 520000 + floor * 38000 + rng() * 680000
    : house
      ? 780000 + rng() * 3600000
      : 420000 + rng() * 1900000;
  return Math.round(raw / 1000) * 1000;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function assertDataset(dataset: Dataset): void {
  const buildings = indexBuildings(dataset.buildings);
  const stats = computeStats(dataset.listings, buildings);
  const expected = {
    imoveis: TOTAL_LISTINGS,
    pontos: MAP_POINTS,
    predios: TOTAL_BUILDINGS,
    posicaoPredio: POSITIONED_BUILDINGS,
    comAndar: WITH_FLOOR,
    semCoordenada: NO_COORD,
  };
  for (const [key, value] of Object.entries(expected)) {
    const actual = stats[key as keyof typeof stats];
    if (actual !== value) {
      throw new Error(`Total da amostra ${key} é ${actual}, esperado ${value}.`);
    }
  }

  const positioned = dataset.buildings.filter((building) => building.lat != null).length;
  if (positioned !== POSITIONED_BUILDINGS) {
    throw new Error(`Prédios posicionados: ${positioned}.`);
  }

  for (const listing of dataset.listings) {
    const building = listing.buildingId ? buildings.get(listing.buildingId) : undefined;
    const position = resolvePosition(listing, building);
    if (!position) continue;
    const inside =
      position.lat >= BOUNDS.south &&
      position.lat <= BOUNDS.north &&
      position.lng >= BOUNDS.west &&
      position.lng <= BOUNDS.east;
    if (!inside) throw new Error(`Coordenada fora da Barra em ${listing.id}.`);
  }
}

export function buildDataset(seed = 20261105): Dataset {
  if (INHERIT < 0) throw new Error("Pontos no mapa excedem os imóveis que podem ser desenhados.");
  const plan = floorPlan();
  const floorBuildings = plan.length;
  const baseBuildings = POSITIONED_BUILDINGS - floorBuildings;
  const houses = WITH_COORD - WITH_FLOOR - baseBuildings;
  const ghosts = NO_COORD - INHERIT - UNPOSITIONED;
  const planned =
    WITH_FLOOR + baseBuildings + INHERIT + UNPOSITIONED + houses + ghosts;
  if (planned !== TOTAL_LISTINGS || houses < 0 || ghosts < 0 || baseBuildings < 0) {
    throw new Error(`Contagem planejada inválida: ${planned}.`);
  }

  const rng = mulberry32(seed);
  const buildings: Building[] = [];
  for (let index = 0; index < TOTAL_BUILDINGS; index += 1) {
    const spot = sampleSpot(rng, 26, 78);
    const positioned = index < POSITIONED_BUILDINGS;
    buildings.push({
      id: `bd-${index}`,
      name: buildingName(index),
      address: `${spot.street}, ${spot.number}`,
      lat: positioned ? spot.lat : null,
      lng: positioned ? spot.lng : null,
    });
  }

  const listings: Listing[] = [];
  const push = (listing: Omit<Listing, "id" | "source" | "seller">) => {
    const id = `im-${listings.length}`;
    listings.push({
      ...listing,
      id,
      source: SOURCES[listings.length % SOURCES.length],
      seller: "unspecified",
    });
  };

  for (let index = 0; index < floorBuildings; index += 1) {
    const building = buildings[index];
    for (const floor of STACKS[plan[index]]) {
      push({
        buildingId: building.id,
        address: building.address,
        lat: building.lat,
        lng: building.lng,
        floor,
        price: priceFor(rng, floor, false),
        advertiser: "agency",
      });
    }
  }

  for (let index = floorBuildings; index < POSITIONED_BUILDINGS; index += 1) {
    const building = buildings[index];
    push({
      buildingId: building.id,
      address: building.address,
      lat: building.lat,
      lng: building.lng,
      floor: null,
      price: priceFor(rng, null, false),
      advertiser: "agency",
    });
  }

  // Listings without their own coordinates that still draw at the building.
  for (let index = 0; index < INHERIT; index += 1) {
    const building = buildings[index];
    push({
      buildingId: building.id,
      address: building.address,
      lat: null,
      lng: null,
      floor: null,
      price: priceFor(rng, null, false),
      advertiser: "agency",
    });
  }

  for (let index = POSITIONED_BUILDINGS; index < TOTAL_BUILDINGS; index += 1) {
    const building = buildings[index];
    push({
      buildingId: building.id,
      address: building.address,
      lat: null,
      lng: null,
      floor: null,
      price: priceFor(rng, null, false),
      advertiser: "agency",
    });
  }

  for (let index = 0; index < houses; index += 1) {
    const spot = sampleSpot(rng, 14, 52);
    push({
      buildingId: null,
      address: `${spot.street}, ${spot.number}`,
      lat: spot.lat,
      lng: spot.lng,
      floor: null,
      price: priceFor(rng, null, true),
      advertiser: "agency",
    });
  }

  for (let index = 0; index < ghosts; index += 1) {
    const spot = sampleSpot(rng, 0, 0);
    push({
      buildingId: null,
      address: `${spot.street}, ${spot.number}`,
      lat: null,
      lng: null,
      floor: null,
      price: priceFor(rng, null, false),
      advertiser: "agency",
    });
  }

  const advertisers = shuffle(
    [
      ...Array<Advertiser>(2500).fill("agency"),
      ...Array<Advertiser>(1400).fill("person"),
      ...Array<Advertiser>(TOTAL_LISTINGS - 3900).fill("unknown"),
    ],
    rng,
  );
  listings.forEach((listing, index) => {
    listing.advertiser = advertisers[index];
  });

  // Seller is drawn after price, coordinates, and advertiser, so those stay on the original seed path.
  // The role is independent of who published the listing.
  listings.forEach((listing) => {
    const roll = rng();
    const ownerChance = listing.advertiser === "person" ? 0.74 : listing.advertiser === "agency" ? 0.58 : 0.22;
    listing.seller = roll < ownerChance ? "owner" : "unspecified";
  });

  const dataset: Dataset = { sample: true, buildings, listings };
  assertDataset(dataset);
  return dataset;
}

export const dataset = buildDataset();
