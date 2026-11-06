import { useMemo, useState, type ReactNode } from "react";
import { cityLabel } from "../data/cities.ts";
import { catalog, DEAL_LABEL, filterListings } from "../data/catalog.ts";
import {
  ADVERTISER_KEYS,
  ADVERTISER_LABEL,
  SELLER_KEYS,
  SELLER_LABEL,
  type Filters,
  type SellerRole,
} from "../data/types.ts";
import { formatFloor, formatListingPrice, formatNumber, formatRooms } from "../format.ts";
import { ListingRow, Pager, Toggle } from "../ui.tsx";

const PAGE_SIZE = 20;

const INITIAL_ADVERTISER: Filters = { agency: true, person: true, unknown: true };
const INITIAL_SELLER: Record<SellerRole, boolean> = { owner: true, unspecified: true };

export function ListingsScreen({ openId }: { openId: string | null }) {
  const [text, setText] = useState("");
  const [cityId, setCityId] = useState("all");
  const [sale, setSale] = useState(true);
  const [rent, setRent] = useState(true);
  const [advertiser, setAdvertiser] = useState<Filters>(INITIAL_ADVERTISER);
  const [seller, setSeller] = useState<Record<SellerRole, boolean>>(INITIAL_SELLER);
  const [page, setPage] = useState(0);

  const cityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const listing of catalog.listings) counts.set(listing.cityId, (counts.get(listing.cityId) ?? 0) + 1);
    return counts;
  }, []);

  const filtered = useMemo(
    () => filterListings({ text, cityId, sale, rent, advertiser, seller }),
    [text, cityId, sale, rent, advertiser, seller],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  if (openId) {
    return (
      <div className="page">
        <ListingDetail id={openId} />
      </div>
    );
  }

  return (
    <div className="page">
      <p className="kicker">
        Brasil
        <span className="pill">Amostra</span>
      </p>
      <h1>Anúncios</h1>
      <p className="subtitle">
        Venda e aluguel em dez cidades. O mapa de ruas continua sendo a vista da Barra da Tijuca, só com venda.
        Tudo nesta lista foi gerado no aplicativo.
      </p>

      <div className="split">
          <aside className="panel-card filters-col">
            <label className="field">
              <span>Busca</span>
              <input
                className="control"
                type="search"
                value={text}
                placeholder="Bairro, cidade ou corretora"
                onChange={(event) => {
                  setText(event.target.value);
                  setPage(0);
                }}
              />
            </label>
            <label className="field">
              <span>Cidade</span>
              <select
                className="control"
                value={cityId}
                onChange={(event) => {
                  setCityId(event.target.value);
                  setPage(0);
                }}
              >
                <option value="all">Todas as cidades ({formatNumber(catalog.listings.length)})</option>
                {catalog.cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}, {city.state} ({formatNumber(cityCounts.get(city.id) ?? 0)})
                  </option>
                ))}
              </select>
            </label>
            <p className="filter-caption">Negócio</p>
            <div className="filters">
              <Toggle checked={sale} onChange={() => { setSale((value) => !value); setPage(0); }} label="Venda" />
              <Toggle checked={rent} onChange={() => { setRent((value) => !value); setPage(0); }} label="Aluguel" />
            </div>
            <p className="filter-caption">Anunciante</p>
            <div className="filters">
              {ADVERTISER_KEYS.map((key) => (
                <Toggle
                  key={key}
                  checked={advertiser[key]}
                  onChange={() => {
                    setAdvertiser((current) => ({ ...current, [key]: !current[key] }));
                    setPage(0);
                  }}
                  label={ADVERTISER_LABEL[key]}
                />
              ))}
            </div>
            <p className="filter-caption">Vendedor</p>
            <div className="filters">
              {SELLER_KEYS.map((key) => (
                <Toggle
                  key={key}
                  checked={seller[key]}
                  onChange={() => {
                    setSeller((current) => ({ ...current, [key]: !current[key] }));
                    setPage(0);
                  }}
                  label={SELLER_LABEL[key]}
                />
              ))}
            </div>
          </aside>

          <section className="panel-card list-card">
            <p className="results-count" aria-live="polite">
              <strong>{formatNumber(filtered.length)}</strong> anúncios na amostra
            </p>
            {slice.length === 0 ? (
              <p className="empty">Nenhum anúncio da amostra com esses filtros.</p>
            ) : (
              slice.map((listing) => (
                <ListingRow
                  key={listing.id}
                  href={`#/anuncios/${listing.id}`}
                  title={listing.title}
                  meta={listingMeta(listing.address, listing.neighborhood, cityLabel(listing.cityId), listing.title)}
                  price={formatListingPrice(listing.price, listing.deal === "rent")}
                  deal={listing.deal}
                  advertiser={ADVERTISER_LABEL[listing.advertiser]}
                  seller={SELLER_LABEL[listing.seller]}
                />
              ))
            )}
            <Pager page={safePage} pages={pages} onPage={setPage} />
          </section>
        </div>

      <p className="note">
        Anunciante é quem publica. Vendedor é o papel de quem vende, quando a amostra informa. Um campo não
        define o outro. OLX, Viva Real e Zap Imóveis são só o rótulo da fonte. A URL usa amostra.example e o
        aplicativo não a consulta.
      </p>
    </div>
  );
}

function ListingDetail({ id }: { id: string }) {
  const listing = catalog.byId.get(id);
  if (!listing) {
    return (
      <div className="detail">
        <a className="back-link" href="#/anuncios">Voltar aos anúncios</a>
        <p className="empty">Anúncio não encontrado na amostra.</p>
      </div>
    );
  }
  const firm = listing.brokerageId ? catalog.brokerageById.get(listing.brokerageId) : undefined;
  return (
    <article className="detail">
      <a className="back-link" href="#/anuncios">Voltar aos anúncios</a>
      <p className="card-kicker">{DEAL_LABEL[listing.deal]}</p>
      <h2 className="detail-title">{listing.title}</h2>
      <p className="card-address">{listing.address}</p>
      <p className="card-price">{formatListingPrice(listing.price, listing.deal === "rent")}</p>
      <dl className="specs">
        <Spec label="Cidade">{cityLabel(listing.cityId)}</Spec>
        <Spec label="Bairro">{listing.neighborhood}</Spec>
        <Spec label="Negócio">{DEAL_LABEL[listing.deal]}</Spec>
        {listing.floor != null && <Spec label="Andar">{formatFloor(listing.floor)}</Spec>}
        {listing.bedrooms != null && listing.areaM2 != null && (
          <Spec label="Imóvel">
            {formatRooms(listing.bedrooms)} · {formatNumber(listing.areaM2)} m²
          </Spec>
        )}
        <Spec label="Anunciante">{ADVERTISER_LABEL[listing.advertiser]}</Spec>
        <Spec label="Vendedor">{SELLER_LABEL[listing.seller]}</Spec>
      </dl>
      <p className="callout">
        Anunciante é quem publica. Vendedor é o papel de quem vende, quando a amostra informa. Um campo não define o outro.
      </p>
      <dl className="specs">
        <Spec label="Corretora">
          {firm ? <a href={`#/corretoras/${firm.id}`}>{firm.name}</a> : "Nenhuma nesta amostra"}
        </Spec>
        <Spec label="Fonte">{listing.source}</Spec>
        <Spec label="URL da amostra">
          <span className="url">{listing.sourceUrl}</span>
        </Spec>
      </dl>
      {listing.onBarraMap && (
        <p>
          <a className="text-link" href={`#/mapa/${listing.id}`}>Ver no mapa da Barra</a>
        </p>
      )}
      {listing.neighborhood === "Barra da Tijuca" && listing.deal === "sale" && !listing.onBarraMap && (
        <p className="note">Esta venda da Barra está na lista, mas não tem ponto no mapa de ruas.</p>
      )}
      <p className="note">
        Amostra gerada neste aplicativo. A fonte e a URL são rótulos ilustrativos. O aplicativo não consulta OLX, Viva Real, Zap Imóveis nem qualquer outro site.
      </p>
    </article>
  );
}

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function listingMeta(address: string, neighborhood: string, city: string, title: string): string {
  const place = `${neighborhood} · ${city}`;
  if (title === address) return place;
  return `${address} · ${place}`;
}
