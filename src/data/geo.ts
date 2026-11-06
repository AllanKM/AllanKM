export type LngLat = { lng: number; lat: number };

export const BOUNDS = {
  west: -43.4,
  east: -43.3,
  south: -23.01,
  north: -22.97,
} as const;

const MID_LAT = ((BOUNDS.south + BOUNDS.north) / 2) * (Math.PI / 180);

export const METERS_PER_DEG_LAT = 110540;
export const METERS_PER_DEG_LNG = 111320 * Math.cos(MID_LAT);

export const WORLD_WIDTH = 100;

const WIDTH_M = (BOUNDS.east - BOUNDS.west) * METERS_PER_DEG_LNG;
const DEPTH_M = (BOUNDS.north - BOUNDS.south) * METERS_PER_DEG_LAT;

export const WORLD_DEPTH = WORLD_WIDTH * (DEPTH_M / WIDTH_M);

export function toWorld(lng: number, lat: number): { x: number; z: number } {
  const centerLng = (BOUNDS.west + BOUNDS.east) / 2;
  const centerLat = (BOUNDS.south + BOUNDS.north) / 2;
  const scale = WORLD_WIDTH / WIDTH_M;
  return {
    x: (lng - centerLng) * METERS_PER_DEG_LNG * scale,
    z: -(lat - centerLat) * METERS_PER_DEG_LAT * scale,
  };
}

export function toCanvas(
  lng: number,
  lat: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * width,
    y: ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * height,
  };
}

export function clampToBounds(point: LngLat): LngLat {
  const margin = 0.00045;
  return {
    lng: Math.min(BOUNDS.east - margin, Math.max(BOUNDS.west + margin, point.lng)),
    lat: Math.min(BOUNDS.north - margin, Math.max(BOUNDS.south + margin, point.lat)),
  };
}

export function pointAlong(points: LngLat[], t: number, offsetMeters: number): LngLat {
  const lengths: number[] = [];
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = Math.hypot(
      (end.lng - start.lng) * METERS_PER_DEG_LNG,
      (end.lat - start.lat) * METERS_PER_DEG_LAT,
    );
    lengths.push(length);
    total += length;
  }

  let remaining = Math.min(1, Math.max(0, t)) * total;
  let index = 0;
  while (index < lengths.length - 1 && remaining > lengths[index]) {
    remaining -= lengths[index];
    index += 1;
  }

  const start = points[index];
  const end = points[index + 1];
  const span = lengths[index] || 1;
  const along = span === 0 ? 0 : remaining / span;
  const lng = start.lng + (end.lng - start.lng) * along;
  const lat = start.lat + (end.lat - start.lat) * along;
  if (offsetMeters === 0) return { lng, lat };

  const heading = Math.atan2(
    (end.lat - start.lat) * METERS_PER_DEG_LAT,
    (end.lng - start.lng) * METERS_PER_DEG_LNG,
  );
  const side = heading + Math.PI / 2;
  return {
    lng: lng + (Math.cos(side) * offsetMeters) / METERS_PER_DEG_LNG,
    lat: lat + (Math.sin(side) * offsetMeters) / METERS_PER_DEG_LAT,
  };
}

export function latitudeAt(points: LngLat[], lng: number): number {
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const min = Math.min(start.lng, end.lng);
    const max = Math.max(start.lng, end.lng);
    if (lng < min || lng > max) continue;
    const span = end.lng - start.lng || 1;
    const along = (lng - start.lng) / span;
    return start.lat + (end.lat - start.lat) * along;
  }
  return points[0]?.lat ?? BOUNDS.south;
}

export function pointInPolygon(lng: number, lat: number, polygon: LngLat[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const start = polygon[index];
    const end = polygon[previous];
    const crosses =
      start.lat > lat !== end.lat > lat &&
      lng < ((end.lng - start.lng) * (lat - start.lat)) / (end.lat - start.lat || 1e-12) + start.lng;
    if (crosses) inside = !inside;
  }
  return inside;
}
