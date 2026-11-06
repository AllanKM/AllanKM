import { CITIES } from "./cities.ts";
import { mulberry32 } from "./rng.ts";

export const INDEX_SEED = 20261107;

const WEIGHT: Record<string, number> = {
  rio: 0.16,
  "sao-paulo": 0.27,
  bh: 0.08,
  brasilia: 0.07,
  salvador: 0.07,
  recife: 0.06,
  "porto-alegre": 0.07,
  curitiba: 0.08,
  fortaleza: 0.07,
  manaus: 0.07,
};

const DRIFT: Record<string, number> = {
  rio: 0.0032,
  "sao-paulo": 0.0044,
  bh: 0.0036,
  brasilia: 0.0035,
  salvador: 0.0029,
  recife: 0.0027,
  "porto-alegre": 0.0031,
  curitiba: 0.004,
  fortaleza: 0.0033,
  manaus: 0.0025,
};

export type IndexPoint = {
  year: number;
  month: number;
  level: number;
};

export type PriceSeries = {
  id: string;
  label: string;
  points: IndexPoint[];
  latest: number;
  yoy: number;
};

export type PriceIndex = {
  sample: true;
  national: PriceSeries;
  cities: PriceSeries[];
  byId: Map<string, PriceSeries>;
};

export function indexMonths(): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  let year = 2016;
  let month = 1;
  while (year < 2026 || (year === 2026 && month <= 10)) {
    months.push({ year, month });
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

function yearOverYear(levels: number[]): number {
  const last = levels.length - 1;
  return levels[last] / levels[last - 12] - 1;
}

/**
 * Simplified repeat-sales path: each fictional home is sold twice, at least a year apart.
 * The average monthly log change along those pairs is chained into an index.
 * This is not the Case-Shiller regression and not a published series.
 */
function estimateLevels(rng: () => number, drift: number, months: number): number[] {
  const properties = 480;
  const latent: number[][] = [];
  for (let property = 0; property < properties; property += 1) {
    const path = [0];
    for (let month = 1; month < months; month += 1) {
      const seasonal = 0.0012 * Math.sin(((month % 12) / 12) * Math.PI * 2);
      const shock = (rng() - 0.5) * 0.007;
      path.push(path[month - 1] + drift + seasonal + shock);
    }
    latent.push(path);
  }

  const sum = new Array<number>(months - 1).fill(0);
  const count = new Array<number>(months - 1).fill(0);
  for (let property = 0; property < properties; property += 1) {
    for (let pair = 0; pair < 2; pair += 1) {
      const latestStart = months - 13;
      const start = Math.floor(rng() * latestStart);
      const room = months - 1 - start;
      const span = 12 + Math.floor(rng() * Math.max(1, room - 11));
      const end = Math.min(months - 1, start + span);
      if (end <= start) continue;
      const perMonth = (latent[property][end] - latent[property][start]) / (end - start);
      for (let month = start; month < end; month += 1) {
        sum[month] += perMonth;
        count[month] += 1;
      }
    }
  }

  const levels = [100];
  for (let month = 0; month < months - 1; month += 1) {
    const change = count[month] > 0 ? sum[month] / count[month] : drift;
    levels.push(levels[month] * Math.exp(change));
  }
  return levels;
}

function seriesFrom(id: string, label: string, levels: number[], months: { year: number; month: number }[]): PriceSeries {
  return {
    id,
    label,
    points: levels.map((level, index) => ({ ...months[index], level })),
    latest: levels[levels.length - 1],
    yoy: yearOverYear(levels),
  };
}

export function buildPriceIndex(): PriceIndex {
  const months = indexMonths();
  const weights = CITIES.map((city) => {
    const weight = WEIGHT[city.id];
    if (weight == null) throw new Error(`Cidade sem peso no índice: ${city.id}.`);
    return weight;
  });
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(weightSum - 1) > 1e-9) throw new Error(`Pesos do índice somam ${weightSum}.`);

  const cityLevels = CITIES.map((city, index) => {
    const drift = DRIFT[city.id];
    if (drift == null) throw new Error(`Cidade sem deriva no índice: ${city.id}.`);
    return estimateLevels(mulberry32(INDEX_SEED + index * 10007), drift, months.length);
  });

  const nationalLevels = months.map((_, month) => {
    let logSum = 0;
    for (let index = 0; index < cityLevels.length; index += 1) {
      logSum += weights[index] * Math.log(cityLevels[index][month]);
    }
    return Math.exp(logSum);
  });
  nationalLevels[0] = 100;

  const cities = CITIES.map((city, index) => seriesFrom(city.id, city.name, cityLevels[index], months));
  const national = seriesFrom("brasil", "Brasil", nationalLevels, months);
  return {
    sample: true,
    national,
    cities,
    byId: new Map([national, ...cities].map((series) => [series.id, series])),
  };
}

export const priceIndex = buildPriceIndex();
