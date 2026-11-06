import { useEffect } from "react";
import { catalog } from "./data/catalog.ts";
import { useRoute } from "./route.ts";
import { BrokeragesScreen } from "./screens/BrokeragesScreen.tsx";
import { IndexScreen } from "./screens/IndexScreen.tsx";
import { ListingsScreen } from "./screens/ListingsScreen.tsx";
import { MapScreen } from "./screens/MapScreen.tsx";

const NAV = [
  ["mapa", "Mapa", "#/mapa"],
  ["anuncios", "Anúncios", "#/anuncios"],
  ["corretoras", "Corretoras", "#/corretoras"],
  ["indice", "Índice", "#/indice"],
] as const;

export function App() {
  const route = useRoute();

  useEffect(() => {
    const titles = {
      mapa: "Mapa da Barra",
      anuncios: "Anúncios",
      corretoras: "Corretoras",
      indice: "Índice de preços",
    } as const;
    let title: string = titles[route.screen];
    if (route.screen === "anuncios" && route.id) title = catalog.byId.get(route.id)?.title ?? "Anúncio";
    if (route.screen === "corretoras" && route.id) title = catalog.brokerageById.get(route.id)?.name ?? "Corretora";
    document.title = `${title} · Imóveis Brasil`;
  }, [route]);

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="#/mapa">Imóveis Brasil</a>
        <nav className="nav" aria-label="Seções">
          {NAV.map(([id, label, href]) => (
            <a key={id} href={href} aria-current={route.screen === id ? "page" : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <span className="pill">Amostra</span>
      </header>
      <main className={route.screen === "mapa" ? "main main-map" : "main main-page"}>
        {route.screen === "mapa" && <MapScreen selectedId={route.id} />}
        {route.screen === "anuncios" && <ListingsScreen openId={route.id} />}
        {route.screen === "corretoras" && <BrokeragesScreen openId={route.id} />}
        {route.screen === "indice" && <IndexScreen />}
      </main>
    </div>
  );
}
