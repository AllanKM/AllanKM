import { useEffect, useMemo, useState } from "react";
import { cityLabel } from "../data/cities.ts";
import { catalog, type Brokerage } from "../data/catalog.ts";
import { normalizeText } from "../data/text.ts";
import { ADVERTISER_LABEL, SELLER_LABEL } from "../data/types.ts";
import { formatListingPrice, formatNumber } from "../format.ts";
import { ListingRow, Pager } from "../ui.tsx";

const PAGE_SIZE = 20;

export function BrokeragesScreen({ openId }: { openId: string | null }) {
  const [text, setText] = useState("");
  const [cityId, setCityId] = useState("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [openId]);

  const firms = useMemo(() => {
    const needle = normalizeText(text.trim());
    return catalog.brokerages.filter((brokerage) => {
      if (cityId !== "all" && brokerage.cityId !== cityId) return false;
      if (!needle) return true;
      const city = catalog.cities.find((item) => item.id === brokerage.cityId);
      const haystack = normalizeText(`${brokerage.name} ${city?.name ?? ""} ${city?.state ?? ""}`);
      return haystack.includes(needle);
    });
  }, [text, cityId]);

  if (openId) return <BrokerageDetail id={openId} page={page} onPage={setPage} />;

  return (
    <div className="page">
      <p className="kicker">
        Brasil
        <span className="pill">Amostra</span>
      </p>
      <h1>Corretoras</h1>
      <p className="subtitle">
        Imobiliárias fictícias da amostra, com a cidade e os anúncios que publicam. A busca olha nome e cidade.
      </p>
      <div className="toolbar">
        <label className="field">
          <span>Nome ou cidade</span>
          <input
            className="control"
            type="search"
            value={text}
            placeholder="Ex.: Horizonte ou Salvador"
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Cidade</span>
          <select className="control" value={cityId} onChange={(event) => setCityId(event.target.value)}>
            <option value="all">Todas as cidades</option>
            {catalog.cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}, {city.state}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="results-count" aria-live="polite">
        <strong>{formatNumber(firms.length)}</strong> corretoras na amostra
      </p>
      {firms.length === 0 ? (
        <p className="empty">Nenhuma corretora da amostra com essa busca.</p>
      ) : (
        <div className="firm-grid">
          {firms.map((firm) => (
            <FirmCard key={firm.id} firm={firm} />
          ))}
        </div>
      )}
      <p className="note">
        Nomes e vínculos desta lista nascem no aplicativo, com semente fixa. Não são cadastros de corretoras reais e não vêm de portais.
      </p>
    </div>
  );
}

function FirmCard({ firm }: { firm: Brokerage }) {
  const count = catalog.listingsByBrokerage.get(firm.id)?.length ?? 0;
  return (
    <a className="firm-card" href={`#/corretoras/${firm.id}`}>
      <h2>{firm.name}</h2>
      <p>{cityLabel(firm.cityId)}</p>
      <p className="firm-count">{formatNumber(count)} anúncios</p>
    </a>
  );
}

function BrokerageDetail({
  id,
  page,
  onPage,
}: {
  id: string;
  page: number;
  onPage: (page: number) => void;
}) {
  const firm = catalog.brokerageById.get(id);
  const listings = catalog.listingsByBrokerage.get(id) ?? [];
  const pages = Math.max(1, Math.ceil(listings.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = listings.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  if (!firm) {
    return (
      <div className="page">
        <a className="back-link" href="#/corretoras">Voltar às corretoras</a>
        <p className="empty">Corretora não encontrada na amostra.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <a className="back-link" href="#/corretoras">Voltar às corretoras</a>
      <p className="kicker">
        {cityLabel(firm.cityId)}
        <span className="pill">Amostra</span>
      </p>
      <h1>{firm.name}</h1>
      <p className="subtitle">
        {formatNumber(listings.length)} anúncios publicados por esta corretora na amostra. O anunciante continua sendo imobiliária ou corretor; o vendedor é outro campo.
      </p>
      <section className="panel-card list-card">
        {slice.map((listing) => (
          <ListingRow
            key={listing.id}
            href={`#/anuncios/${listing.id}`}
            title={listing.title}
            meta={`${listing.neighborhood} · ${cityLabel(listing.cityId)}`}
            price={formatListingPrice(listing.price, listing.deal === "rent")}
            deal={listing.deal}
            advertiser={ADVERTISER_LABEL[listing.advertiser]}
            seller={SELLER_LABEL[listing.seller]}
          />
        ))}
        <Pager page={safePage} pages={pages} onPage={onPage} />
      </section>
    </div>
  );
}
