# Imóveis Brasil

Dark map of sample sale listings along the streets of Barra da Tijuca, Rio de Janeiro. One point per placed listing. In a building, the point rises with the advertised floor.

The dataset is generated in the browser from a fixed seed. It is not a live feed and it is not scraped from OLX, Viva Real, Zap Imóveis, or any other portal. Those names appear only as sample source labels when a point is opened.

## Sample totals

With every filter on:

| | |
| --- | --- |
| Imóveis | 4.689 |
| Pontos no mapa | 2.488 |
| Prédios | 1.016 |
| Posição do prédio | 666 |
| Com andar | 930 |
| Sem coordenada | 2.281 |

2.281 listings have no coordinates of their own. 80 of them still draw because their building has a map position, so they count in both “Sem coordenada” and “Pontos no mapa”. The other 2.201 are counted as listings only. Coordinates sit inside Barra (about lat -23.01 to -22.97, lng -43.40 to -43.30), denser along the main avenues. The street drawing is a schematic of those avenues, not a survey.

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

Drag to move the map, scroll or pinch to zoom, and use a second finger or the right mouse button to tilt. The square at the top-right recenters the view. Filters update the counts and the points.
