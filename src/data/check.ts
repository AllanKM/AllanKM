import { dataset } from "./generate.ts";
import { computeStats, indexBuildings, listingsFor } from "./stats.ts";
import type { Filters } from "./types.ts";

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
if (failed) process.exit(1);
