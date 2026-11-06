import type { Deal } from "./data/catalog.ts";
import { DEAL_LABEL } from "./data/catalog.ts";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="switch" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function ListingRow({
  href,
  title,
  meta,
  price,
  deal,
  advertiser,
  seller,
}: {
  href: string;
  title: string;
  meta: string;
  price: string;
  deal: Deal;
  advertiser: string;
  seller: string;
}) {
  return (
    <a className="listing-row" href={href}>
      <div className="listing-top">
        <div>
          <strong>{title}</strong>
          <span>{meta}</span>
        </div>
        <div className="listing-price">
          <span className={deal === "sale" ? "tag tag-sale" : "tag"}>{DEAL_LABEL[deal]}</span>
          <b>{price}</b>
        </div>
      </div>
      <p className="people">
        <span>
          Anunciante <b>{advertiser}</b>
        </span>
        <span>
          Vendedor <b>{seller}</b>
        </span>
      </p>
    </a>
  );
}

export function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)}>
        Anterior
      </button>
      <span>
        {page + 1} de {pages}
      </span>
      <button type="button" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
        Próxima
      </button>
    </div>
  );
}
