import { useEffect, useRef, useState } from "react";
import { cityLabel } from "../data/cities.ts";
import { priceIndex, type PriceSeries } from "../data/priceIndex.ts";
import { formatIndex, formatMonth, formatMonthLong, formatPercent } from "../format.ts";

export function IndexScreen() {
  const [placeId, setPlaceId] = useState("brasil");
  const series = priceIndex.byId.get(placeId) ?? priceIndex.national;
  const first = series.points[0];
  const last = series.points[series.points.length - 1];
  const placeLabel = series.id === "brasil" ? "Brasil" : cityLabel(series.id);

  return (
    <div className="page">
      <p className="kicker">
        Vendas
        <span className="pill">Amostra</span>
      </p>
      <h1>Índice de preços</h1>
      <p className="subtitle">
        Série ilustrativa para {placeLabel}, de {formatMonthLong(first.year, first.month)} a {formatMonthLong(last.year, last.month)}.
        Base 100 em {formatMonthLong(first.year, first.month)}. Só venda.
      </p>

      <div className="chips" role="group" aria-label="Praça do índice">
        {[priceIndex.national, ...priceIndex.cities].map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === series.id ? "chip is-on" : "chip"}
            aria-pressed={item.id === series.id}
            onClick={() => setPlaceId(item.id)}
          >
            {item.id === "brasil" ? "Brasil" : item.label}
          </button>
        ))}
      </div>

      <div className="index-stats">
        <div className="stat">
          <span>Nível em {formatMonth(last.year, last.month)}</span>
          <strong>{formatIndex(series.latest)}</strong>
        </div>
        <div className="stat">
          <span>Variação em 12 meses</span>
          <strong>{formatPercent(series.yoy)}</strong>
        </div>
      </div>

      <IndexChart series={series} />

      <div className="table-wrap">
        <table className="index-table">
          <caption>Nível mais recente e variação em 12 meses, na amostra</caption>
          <thead>
            <tr>
              <th scope="col">Praça</th>
              <th className="num" scope="col">Nível</th>
              <th className="num" scope="col">12 meses</th>
            </tr>
          </thead>
          <tbody>
            {[priceIndex.national, ...priceIndex.cities].map((item) => (
              <tr key={item.id} className={item.id === series.id ? "is-on" : undefined}>
                <th scope="row">
                  <button type="button" onClick={() => setPlaceId(item.id)}>
                    {item.id === "brasil" ? "Brasil" : `${item.label}, ${cityState(item.id)}`}
                  </button>
                </th>
                <td className="num">{formatIndex(item.latest)}</td>
                <td className="num">{formatPercent(item.yoy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="note">
        Série de amostra no estilo Case-Shiller. Ela imita um índice de vendas repetidas: o mesmo imóvel entra na compra e, depois, na revenda, e essa variação forma o índice. Só entram vendas. Não é o IBGE, não é o FipeZap e não é um índice publicado.
      </p>
    </div>
  );
}

function cityState(cityId: string): string {
  const label = cityLabel(cityId);
  const state = label.split(", ").at(-1);
  return state ?? "";
}

function IndexChart({ series }: { series: PriceSeries }) {
  const width = 760;
  const height = 300;
  const pad = { left: 48, right: 16, top: 18, bottom: 32 };
  const points = series.points;
  const levels = points.map((point) => point.level);
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const y0 = Math.floor((min - 4) / 10) * 10;
  const y1 = Math.ceil((max + 4) / 10) * 10;
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const xAt = (index: number) => pad.left + (index / (points.length - 1)) * innerWidth;
  const yAt = (level: number) => pad.top + (1 - (level - y0) / (y1 - y0)) * innerHeight;
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${xAt(index).toFixed(1)},${yAt(point.level).toFixed(1)}`).join(" ");
  const area = `${line} L${xAt(points.length - 1).toFixed(1)},${yAt(y0).toFixed(1)} L${xAt(0).toFixed(1)},${yAt(y0).toFixed(1)} Z`;
  const ticks: number[] = [];
  for (let value = Math.ceil(y0 / 20) * 20; value <= y1; value += 20) ticks.push(value);
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setActive(null);
  }, [series]);

  function readIndex(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const viewX = ((clientX - rect.left) / rect.width) * width;
    const ratio = (viewX - pad.left) / innerWidth;
    const index = Math.round(ratio * (points.length - 1));
    if (index < 0 || index >= points.length) return null;
    return index;
  }

  const current = active == null ? null : points[active];
  const summary = `${series.label}, base 100 em ${formatMonth(points[0].year, points[0].month)}, nível ${formatIndex(series.latest)} em ${formatMonth(points[points.length - 1].year, points[points.length - 1].month)}, variação de 12 meses ${formatPercent(series.yoy)}.`;

  return (
    <figure className="chart-card">
      <svg
        ref={svgRef}
        className="index-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={summary}
        onPointerMove={(event) => setActive(readIndex(event.clientX))}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={yAt(tick)} y2={yAt(tick)} className="grid-line" />
            <text x={pad.left - 8} y={yAt(tick) + 4} textAnchor="end">
              {formatIndex(tick).replace(",0", "")}
            </text>
          </g>
        ))}
        {y0 < 100 && y1 > 100 && (
          <line x1={pad.left} x2={width - pad.right} y1={yAt(100)} y2={yAt(100)} className="base-line" />
        )}
        <path d={area} className="area" />
        <path d={line} className="series" />
        {points.map((point, index) =>
          point.month === 1 && point.year % 2 === 0 ? (
            <text key={`${point.year}-${point.month}`} x={xAt(index)} y={height - 10} textAnchor="middle">
              {point.year}
            </text>
          ) : null,
        )}
        {current && active != null && (
          <g>
            <line x1={xAt(active)} x2={xAt(active)} y1={pad.top} y2={height - pad.bottom} className="hover-line" />
            <circle cx={xAt(active)} cy={yAt(current.level)} r="4" className="hover-dot" />
          </g>
        )}
      </svg>
      <figcaption aria-live="polite">
        {current ? `${formatMonth(current.year, current.month)} · ${formatIndex(current.level)}` : "Passe o cursor no gráfico para ver o mês."}
      </figcaption>
    </figure>
  );
}
