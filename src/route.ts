import { useEffect, useState } from "react";

export type Route =
  | { screen: "mapa" | "anuncios" | "corretoras"; id: string | null }
  | { screen: "indice" };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const head = parts[0] ?? "mapa";
  if (head === "indice") return { screen: "indice" };
  if (head === "anuncios" || head === "corretoras" || head === "mapa") {
    return { screen: head, id: parts[1] ?? null };
  }
  return { screen: "mapa", id: null };
}

export function setHash(next: string, mode: "push" | "replace" = "push"): void {
  const normalized = next.startsWith("#") ? next : `#${next}`;
  if (window.location.hash === normalized) return;
  if (mode === "replace") history.replaceState(null, "", normalized);
  else history.pushState(null, "", normalized);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    if (!window.location.hash) history.replaceState(null, "", "#/mapa");
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return route;
}
