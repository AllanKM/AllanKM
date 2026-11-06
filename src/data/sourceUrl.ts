import type { SourceName } from "./types.ts";

const SOURCE_SLUG: Record<SourceName, string> = {
  OLX: "olx",
  "Viva Real": "viva-real",
  "Zap Imóveis": "zap-imoveis",
};

/** Illustrative label only. The app never requests this address. */
export function sampleSourceUrl(source: SourceName, id: string): string {
  return `https://amostra.example/anuncios/${SOURCE_SLUG[source]}/${id}`;
}
