export type CityTier = "high" | "mid" | "other";

export type City = {
  id: string;
  name: string;
  state: string;
  tier: CityTier;
  neighborhoods: string[];
};

export const CITIES: City[] = [
  {
    id: "rio",
    name: "Rio de Janeiro",
    state: "RJ",
    tier: "high",
    neighborhoods: ["Copacabana", "Ipanema", "Botafogo", "Tijuca", "Leblon", "Recreio dos Bandeirantes"],
  },
  {
    id: "sao-paulo",
    name: "São Paulo",
    state: "SP",
    tier: "high",
    neighborhoods: ["Pinheiros", "Vila Mariana", "Moema", "Perdizes", "Santana", "Tatuapé"],
  },
  {
    id: "bh",
    name: "Belo Horizonte",
    state: "MG",
    tier: "mid",
    neighborhoods: ["Savassi", "Lourdes", "Buritis", "Funcionários", "Sion", "Pampulha"],
  },
  {
    id: "brasilia",
    name: "Brasília",
    state: "DF",
    tier: "mid",
    neighborhoods: ["Asa Sul", "Asa Norte", "Sudoeste", "Lago Sul", "Águas Claras", "Noroeste"],
  },
  {
    id: "salvador",
    name: "Salvador",
    state: "BA",
    tier: "other",
    neighborhoods: ["Barra", "Ondina", "Rio Vermelho", "Pituba", "Graça", "Caminho das Árvores"],
  },
  {
    id: "recife",
    name: "Recife",
    state: "PE",
    tier: "other",
    neighborhoods: ["Boa Viagem", "Casa Forte", "Espinheiro", "Pina", "Graças", "Madalena"],
  },
  {
    id: "porto-alegre",
    name: "Porto Alegre",
    state: "RS",
    tier: "mid",
    neighborhoods: ["Moinhos de Vento", "Petrópolis", "Menino Deus", "Bela Vista", "Auxiliadora", "Rio Branco"],
  },
  {
    id: "curitiba",
    name: "Curitiba",
    state: "PR",
    tier: "mid",
    neighborhoods: ["Batel", "Água Verde", "Cabral", "Bigorrilho", "Juvevê", "Centro Cívico"],
  },
  {
    id: "fortaleza",
    name: "Fortaleza",
    state: "CE",
    tier: "mid",
    neighborhoods: ["Meireles", "Aldeota", "Mucuripe", "Cocó", "Varjota", "Dionísio Torres"],
  },
  {
    id: "manaus",
    name: "Manaus",
    state: "AM",
    tier: "other",
    neighborhoods: ["Adrianópolis", "Aleixo", "Parque Dez", "Ponta Negra", "Nossa Senhora das Graças", "Chapada"],
  },
];

export const CITY_BY_ID = new Map(CITIES.map((city) => [city.id, city]));

export function cityLabel(cityId: string): string {
  const city = CITY_BY_ID.get(cityId);
  return city ? `${city.name}, ${city.state}` : cityId;
}
