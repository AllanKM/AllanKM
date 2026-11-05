import {
  clampToBounds,
  latitudeAt,
  pointAlong,
  pointInPolygon,
  type LngLat,
} from "./geo.ts";

export type Street = {
  name: string;
  weight: number;
  points: LngLat[];
  /** Offset sign that stays on land when walking the polyline in order. */
  landSide: "left" | "right" | "both";
  major: boolean;
};

const LUCIO: LngLat[] = [
  { lng: -43.3975, lat: -23.0086 },
  { lng: -43.372, lat: -23.0066 },
  { lng: -43.345, lat: -23.0054 },
  { lng: -43.318, lat: -23.0062 },
  { lng: -43.3025, lat: -23.0076 },
];

const AMERICAS: LngLat[] = [
  { lng: -43.3982, lat: -23.0026 },
  { lng: -43.374, lat: -22.9994 },
  { lng: -43.348, lat: -22.9976 },
  { lng: -43.322, lat: -22.9988 },
  { lng: -43.3028, lat: -23.0012 },
];

const LAGOON: LngLat[] = [
  { lng: -43.399, lat: -22.988 },
  { lng: -43.376, lat: -22.9722 },
  { lng: -43.348, lat: -22.9718 },
  { lng: -43.332, lat: -22.982 },
  { lng: -43.35, lat: -22.9935 },
  { lng: -43.382, lat: -22.993 },
];

const MAJORS: Street[] = [
  { name: "Av. Lúcio Costa", weight: 16, points: LUCIO, landSide: "left", major: true },
  { name: "Av. das Américas", weight: 36, points: AMERICAS, landSide: "both", major: true },
  {
    name: "Av. Ayrton Senna",
    weight: 14,
    landSide: "both",
    major: true,
    points: [
      { lng: -43.369, lat: -23.0002 },
      { lng: -43.354, lat: -22.989 },
      { lng: -43.34, lat: -22.978 },
      { lng: -43.328, lat: -22.9716 },
    ],
  },
  {
    name: "Av. Embaixador Abelardo Bueno",
    weight: 11,
    landSide: "both",
    major: true,
    points: [
      { lng: -43.393, lat: -23.0016 },
      { lng: -43.384, lat: -22.9895 },
      { lng: -43.374, lat: -22.9775 },
      { lng: -43.366, lat: -22.9718 },
    ],
  },
  {
    name: "Av. Salvador Allende",
    weight: 7,
    landSide: "both",
    major: true,
    points: [
      { lng: -43.346, lat: -22.9992 },
      { lng: -43.338, lat: -22.9885 },
      { lng: -43.33, lat: -22.977 },
    ],
  },
  {
    name: "Av. João Cabral de Melo Neto",
    weight: 6,
    landSide: "both",
    major: true,
    points: [
      { lng: -43.322, lat: -23.0048 },
      { lng: -43.314, lat: -22.9955 },
      { lng: -43.306, lat: -22.986 },
    ],
  },
  {
    name: "Av. Ministro Ivan Lins",
    weight: 6,
    landSide: "both",
    major: true,
    points: [
      { lng: -43.334, lat: -23.0038 },
      { lng: -43.326, lat: -22.995 },
      { lng: -43.318, lat: -22.9865 },
    ],
  },
  {
    name: "Av. Prefeito Dulcídio Cardoso",
    weight: 5,
    landSide: "both",
    major: true,
    points: [
      { lng: -43.316, lat: -23.0064 },
      { lng: -43.31, lat: -22.998 },
      { lng: -43.304, lat: -22.99 },
    ],
  },
  {
    name: "Av. Armando Lombardi",
    weight: 4,
    landSide: "left",
    major: false,
    points: [
      { lng: -43.328, lat: -23.0078 },
      { lng: -43.312, lat: -23.0068 },
      { lng: -43.303, lat: -23.0072 },
    ],
  },
  {
    name: "Av. Olegário Maciel",
    weight: 4,
    landSide: "both",
    major: false,
    points: [
      { lng: -43.362, lat: -23.0072 },
      { lng: -43.356, lat: -23.001 },
      { lng: -43.35, lat: -22.9968 },
    ],
  },
];

const CROSS_NAMES = [
  "Av. do Pepê",
  "Av. General Guedes da Fontoura",
  "Av. Érico Veríssimo",
  "Av. Aquarela do Brasil",
  "Alameda das Acácias",
  "Alameda dos Flamboyants",
  "Rua das Gaivotas",
  "Rua do Canal",
  "Travessa da Lagoa",
  "Rua do Parque",
];

function crossStreets(): Street[] {
  return CROSS_NAMES.map((name, index) => {
    const t = (index + 1) / (CROSS_NAMES.length + 1);
    const beach = pointAlong(LUCIO, t, 0);
    const avenue = pointAlong(AMERICAS, t, 0);
    const inland = {
      lng: avenue.lng + (avenue.lng - beach.lng) * 0.72,
      lat: avenue.lat + (avenue.lat - beach.lat) * 0.72,
    };
    return {
      name,
      weight: 2.4,
      landSide: "both" as const,
      major: false,
      points: [beach, avenue, inland],
    };
  });
}

let cached: Street[] | null = null;

export function allStreets(): Street[] {
  cached ??= [...MAJORS, ...crossStreets()];
  return cached;
}

export function shoreLine(): LngLat[] {
  return LUCIO;
}

export function avenueLine(): LngLat[] {
  return AMERICAS;
}

export function lagoonShape(): LngLat[] {
  return LAGOON;
}

export type StreetSpot = LngLat & { street: string; number: number };

function pickStreet(rng: () => number): Street {
  const streets = allStreets();
  const total = streets.reduce((sum, street) => sum + street.weight, 0);
  let cursor = rng() * total;
  for (const street of streets) {
    cursor -= street.weight;
    if (cursor <= 0) return street;
  }
  return streets[streets.length - 1];
}

function keepOnLand(point: LngLat): LngLat {
  let { lng, lat } = point;
  const shore = latitudeAt(LUCIO, lng);
  if (lat < shore + 0.00028) lat = shore + 0.00028;
  if (pointInPolygon(lng, lat, LAGOON)) lat -= 0.002;
  return clampToBounds({ lng, lat });
}

export function sampleSpot(rng: () => number, minOffset: number, maxOffset: number): StreetSpot {
  const street = pickStreet(rng);
  const t = 0.035 + rng() * 0.93;
  let offset = minOffset + rng() * Math.max(0, maxOffset - minOffset);
  if (street.landSide === "both") offset *= rng() < 0.5 ? -1 : 1;
  if (street.landSide === "right") offset *= -1;
  const placed = keepOnLand(pointAlong(street.points, t, offset));
  const number = 100 + Math.round(t * 140) * 100 + Math.floor(rng() * 30) * 2;
  return { ...placed, street: street.name, number };
}
