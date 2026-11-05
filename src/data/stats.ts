import { resolvePosition } from "./position.ts";
import type { Building, Dataset, Filters, Listing, MapStats } from "./types.ts";

export function indexBuildings(buildings: Building[]): Map<string, Building> {
  return new Map(buildings.map((building) => [building.id, building]));
}

export function computeStats(
  listings: Listing[],
  buildings: Map<string, Building>,
): MapStats {
  const buildingIds = new Set<string>();
  let pontos = 0;
  let comAndar = 0;
  let semCoordenada = 0;

  for (const listing of listings) {
    if (listing.floor != null) comAndar += 1;
    if (listing.lat == null || listing.lng == null) semCoordenada += 1;
    const building = listing.buildingId ? buildings.get(listing.buildingId) : undefined;
    if (listing.buildingId) buildingIds.add(listing.buildingId);
    if (resolvePosition(listing, building)) pontos += 1;
  }

  let posicaoPredio = 0;
  for (const id of buildingIds) {
    const building = buildings.get(id);
    if (building?.lat != null && building.lng != null) posicaoPredio += 1;
  }

  return {
    imoveis: listings.length,
    pontos,
    predios: buildingIds.size,
    posicaoPredio,
    comAndar,
    semCoordenada,
  };
}

export function listingsFor(dataset: Dataset, filters: Filters): Listing[] {
  return dataset.listings.filter((listing) => filters[listing.advertiser]);
}
