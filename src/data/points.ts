import { toWorld } from "./geo.ts";
import { resolvePosition } from "./position.ts";
import type { Building, Listing } from "./types.ts";

export type MapPoint = {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: "dot" | "ring";
};

export function toMapPoints(listings: Listing[], buildings: Map<string, Building>): MapPoint[] {
  const points: MapPoint[] = [];
  for (const listing of listings) {
    const building = listing.buildingId ? buildings.get(listing.buildingId) : undefined;
    const position = resolvePosition(listing, building);
    if (!position) continue;
    const world = toWorld(position.lng, position.lat);
    const floor = listing.floor;
    points.push({
      id: listing.id,
      x: world.x,
      y: floor == null ? 0.18 : 0.55 + floor * 0.48,
      z: world.z,
      kind: floor == null ? "ring" : "dot",
    });
  }
  return points;
}
