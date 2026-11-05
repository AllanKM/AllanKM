import type { Building, Listing } from "./types.ts";

export function resolvePosition(
  listing: Listing,
  building: Building | undefined,
): { lat: number; lng: number } | null {
  if (listing.lat != null && listing.lng != null) {
    return { lat: listing.lat, lng: listing.lng };
  }
  if (building?.lat != null && building.lng != null) {
    return { lat: building.lat, lng: building.lng };
  }
  return null;
}
