import { useEffect, useMemo, useState } from "react";
import { dataset } from "./data/generate.ts";
import { toMapPoints } from "./data/points.ts";
import { computeStats, indexBuildings, listingsFor } from "./data/stats.ts";
import { ADVERTISER_LABEL, type Advertiser, type Filters } from "./data/types.ts";
import { formatFloor, formatNumber, formatPrice } from "./format.ts";
import { BarraMap } from "./map/BarraMap.tsx";

const FILTER_KEYS: Advertiser[] = ["agency", "person", "unknown"];

const INITIAL_FILTERS: Filters = {
  agency: true,
  person: true,
  unknown: true,
};

export function App() {
  const buildings = useMemo(() => indexBuildings(dataset.buildings), []);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleListings = useMemo(() => listingsFor(dataset, filters), [filters]);
  const stats = useMemo(() => computeStats(visibleListings, buildings), [visibleListings, buildings]);
  const points = useMemo(() => toMapPoints(visibleListings, buildings), [visibleListings, buildings]);
  const selected = selectedId ? dataset.listings.find((listing) => listing.id === selectedId) ?? null : null;
  const selectedBuilding = selected?.buildingId ? buildings.get(selected.buildingId) : undefined;

  useEffect(() => {
    if (selectedId && !visibleListings.some((listing) => listing.id === selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, visibleListings]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const title = selectedBuilding?.name ?? selected?.address;
  const addressLine = selectedBuilding ? selected?.address : "Barra da Tijuca, Rio de Janeiro";

  return (
    <div className="app">
      <section className="map-wrap" aria-label="Mapa">
        <BarraMap points={points} selectedId={selectedId} onSelect={setSelectedId} />
        {selected && title && (
          <article className="card">
            <button type="button" className="card-close" onClick={() => setSelectedId(null)} aria-label="Fechar">
              ×
            </button>
            <p className="card-kicker">Imóvel à venda</p>
            <h2>{title}</h2>
            {addressLine && <p className="card-address">{addressLine}</p>}
            {selected.floor != null && <p className="card-floor">{formatFloor(selected.floor)}</p>}
            <p className="card-price">{formatPrice(selected.price)}</p>
            <p className="card-advertiser">{ADVERTISER_LABEL[selected.advertiser]}</p>
            <p className="card-source">
              <span>Fonte da amostra</span>
              <strong>{selected.source}</strong>
            </p>
          </article>
        )}
      </section>

      <aside className="panel">
        <p className="kicker">
          Barra da Tijuca, Rio de Janeiro
          <span className="pill">Amostra</span>
        </p>
        <h1>Mapa de ruas da Barra</h1>
        <p className="subtitle">
          Um ponto por imóvel à venda. Em prédio, o ponto sobe até o andar do anúncio.
        </p>

        <h2 className="section-label">O QUE ESTÁ NO MAPA</h2>
        <div className="stats" aria-live="polite">
          <Stat label="Imóveis" value={stats.imoveis} />
          <Stat label="Pontos no mapa" value={stats.pontos} />
          <Stat label="Prédios" value={stats.predios} />
          <Stat label="Posição do prédio" value={stats.posicaoPredio} />
          <Stat label="Com andar" value={stats.comAndar} />
          <Stat label="Sem coordenada" value={stats.semCoordenada} />
        </div>

        <h2 className="section-label">FILTRAR</h2>
        <div className="filters">
          {FILTER_KEYS.map((key) => (
            <label key={key} className="toggle">
              <input
                type="checkbox"
                checked={filters[key]}
                onChange={() => setFilters((current) => ({ ...current, [key]: !current[key] }))}
              />
              <span className="switch" aria-hidden="true" />
              <span>{ADVERTISER_LABEL[key]}</span>
            </label>
          ))}
        </div>

        <p className="note">
          Amostra gerada neste aplicativo, dentro dos limites da Barra da Tijuca. Não é um anúncio
          real e não vem de portais. OLX, Viva Real e Zap Imóveis aparecem só como rótulo no
          detalhe do ponto.
        </p>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}
