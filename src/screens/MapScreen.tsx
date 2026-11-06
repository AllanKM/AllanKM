import { useEffect, useMemo, useState } from "react";
import { catalog } from "../data/catalog.ts";
import { dataset } from "../data/generate.ts";
import { toMapPoints } from "../data/points.ts";
import { sampleSourceUrl } from "../data/sourceUrl.ts";
import { computeStats, indexBuildings, listingsFor } from "../data/stats.ts";
import {
  ADVERTISER_KEYS,
  ADVERTISER_LABEL,
  SELLER_KEYS,
  SELLER_LABEL,
  type Filters,
  type SellerRole,
} from "../data/types.ts";
import { formatFloor, formatNumber, formatPrice } from "../format.ts";
import { BarraMap } from "../map/BarraMap.tsx";
import { setHash } from "../route.ts";
import { Toggle } from "../ui.tsx";

const INITIAL_ADVERTISER: Filters = {
  agency: true,
  person: true,
  unknown: true,
};

const INITIAL_SELLER: Record<SellerRole, boolean> = {
  owner: true,
  unspecified: true,
};

export function MapScreen({ selectedId }: { selectedId: string | null }) {
  const buildings = useMemo(() => indexBuildings(dataset.buildings), []);
  const [advertiserFilters, setAdvertiserFilters] = useState<Filters>(INITIAL_ADVERTISER);
  const [sellerFilters, setSellerFilters] = useState<Record<SellerRole, boolean>>(INITIAL_SELLER);

  const visibleListings = useMemo(
    () => listingsFor(dataset, advertiserFilters).filter((listing) => sellerFilters[listing.seller]),
    [advertiserFilters, sellerFilters],
  );
  const stats = useMemo(() => computeStats(visibleListings, buildings), [visibleListings, buildings]);
  const points = useMemo(() => toMapPoints(visibleListings, buildings), [visibleListings, buildings]);
  const selected = selectedId ? dataset.listings.find((listing) => listing.id === selectedId) ?? null : null;
  const selectedBuilding = selected?.buildingId ? buildings.get(selected.buildingId) : undefined;
  const firmId = selected ? catalog.byId.get(selected.id)?.brokerageId : null;
  const firm = firmId ? catalog.brokerageById.get(firmId) : undefined;

  useEffect(() => {
    if (!selectedId) return;
    if (!selected || !visibleListings.some((listing) => listing.id === selectedId)) {
      setHash("#/mapa", "replace");
    }
  }, [selected, selectedId, visibleListings]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHash("#/mapa", "replace");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const title = selectedBuilding?.name ?? selected?.address;
  const addressLine = selectedBuilding ? selected?.address : "Barra da Tijuca, Rio de Janeiro";

  return (
    <div className="map-screen">
      <section className="map-wrap" aria-label="Mapa">
        <BarraMap
          points={points}
          selectedId={selectedId}
          onSelect={(id) => setHash(id ? `#/mapa/${id}` : "#/mapa", "replace")}
        />
        {selected && title && (
          <article className="card">
            <button type="button" className="card-close" onClick={() => setHash("#/mapa", "replace")} aria-label="Fechar">
              ×
            </button>
            <p className="card-kicker">Imóvel à venda</p>
            <h2>{title}</h2>
            {addressLine && <p className="card-address">{addressLine}</p>}
            {selected.floor != null && <p className="card-floor">{formatFloor(selected.floor)}</p>}
            <p className="card-price">{formatPrice(selected.price)}</p>
            <dl className="card-fields">
              <div>
                <dt>Anunciante</dt>
                <dd>{ADVERTISER_LABEL[selected.advertiser]}</dd>
              </div>
              <div>
                <dt>Vendedor</dt>
                <dd>{SELLER_LABEL[selected.seller]}</dd>
              </div>
              {firm && (
                <div>
                  <dt>Corretora</dt>
                  <dd>
                    <a href={`#/corretoras/${firm.id}`}>{firm.name}</a>
                  </dd>
                </div>
              )}
            </dl>
            <p className="card-source">
              <span>Fonte da amostra</span>
              <strong>{selected.source}</strong>
            </p>
            <p className="card-url">
              <span>URL da amostra</span>
              {sampleSourceUrl(selected.source, selected.id)}
            </p>
            <a className="card-open" href={`#/anuncios/${selected.id}`}>
              Abrir na lista
            </a>
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

        <h2 className="section-label">O que está no mapa</h2>
        <div className="stats" aria-live="polite">
          <Stat label="Imóveis" value={stats.imoveis} />
          <Stat label="Pontos no mapa" value={stats.pontos} />
          <Stat label="Prédios" value={stats.predios} />
          <Stat label="Posição do prédio" value={stats.posicaoPredio} />
          <Stat label="Com andar" value={stats.comAndar} />
          <Stat label="Sem coordenada" value={stats.semCoordenada} />
        </div>

        <h2 className="section-label">Filtrar</h2>
        <p className="filter-caption">Anunciante</p>
        <div className="filters">
          {ADVERTISER_KEYS.map((key) => (
            <Toggle
              key={key}
              checked={advertiserFilters[key]}
              onChange={() => setAdvertiserFilters((current) => ({ ...current, [key]: !current[key] }))}
              label={ADVERTISER_LABEL[key]}
            />
          ))}
        </div>
        <p className="filter-caption">Vendedor</p>
        <div className="filters">
          {SELLER_KEYS.map((key) => (
            <Toggle
              key={key}
              checked={sellerFilters[key]}
              onChange={() => setSellerFilters((current) => ({ ...current, [key]: !current[key] }))}
              label={SELLER_LABEL[key]}
            />
          ))}
        </div>

        <p className="note">
          Amostra gerada neste aplicativo, dentro dos limites da Barra da Tijuca. Não é um anúncio
          real e não vem de portais. OLX, Viva Real e Zap Imóveis aparecem só como rótulo no
          detalhe do ponto, com uma URL de amostra que o aplicativo não consulta. Anunciante e
          vendedor são campos separados.
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
