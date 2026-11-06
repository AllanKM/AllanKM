# Imóveis Brasil

Sample Brazilian property browser. The interface is in Portuguese. Every number is generated in the app from a fixed seed. Nothing is scraped, and the app does not call OLX, Viva Real, Zap Imóveis, or any other portal. Those names are source labels only. Listing URLs use `amostra.example` and are never requested.

## Screens

- **Mapa** — street map of sample sale listings in Barra da Tijuca, Rio de Janeiro. One 3D point per placed listing. In a building, the point rises with the advertised floor. Filters cover advertiser type and, separately, seller role.
- **Anúncios** — sale and rent across Rio de Janeiro, São Paulo, Belo Horizonte, Brasília, Salvador, Recife, Porto Alegre, Curitiba, Fortaleza, and Manaus. Opening a listing shows price, sale or rent, city, advertiser, seller, and a sample source URL. Barra sales that have a map point can be opened on the map.
- **Corretoras** — fictional brokerages with city, listing count, and the sample listings they advertise. Search by name and city.
- **Índice** — illustrative repeat-sales price index for Brazil and for each city above, sale only. Shows the latest level and a 12-month change. It is not IBGE, FipeZap, or a published index.

Advertiser (who published) and seller (owner, or not informed) are different fields, with filters for both.

## Map sample

With every map filter on:

| | |
| --- | --- |
| Imóveis | 4.689 |
| Pontos no mapa | 2.488 |
| Prédios | 1.016 |
| Posição do prédio | 666 |
| Com andar | 930 |
| Sem coordenada | 2.281 |

2.281 listings have no coordinates of their own. 80 of them still draw because their building has a map position, so they count in both “Sem coordenada” and “Pontos no mapa”. The other 2.201 are counted as listings only. Coordinates sit inside Barra (about lat -23.01 to -22.97, lng -43.40 to -43.30), denser along the main avenues. The street drawing is a schematic of those avenues, not a survey.

The national list includes those Barra sales and adds rentals plus listings in the other cities. The price index runs from January 2016 through October 2026, with January 2016 set to 100.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Drag to move the map, scroll or pinch to zoom, and use a second finger or the right mouse button to tilt. The square at the top-right recenters the view.
