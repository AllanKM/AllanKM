export type Advertiser = "agency" | "person" | "unknown";

export type SellerRole = "owner" | "unspecified";

export type SourceName = "OLX" | "Viva Real" | "Zap Imóveis";

export type Building = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

export type Listing = {
  id: string;
  buildingId: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  floor: number | null;
  price: number;
  advertiser: Advertiser;
  seller: SellerRole;
  source: SourceName;
};

export type Dataset = {
  sample: true;
  buildings: Building[];
  listings: Listing[];
};

export type Filters = Record<Advertiser, boolean>;

export type MapStats = {
  imoveis: number;
  pontos: number;
  predios: number;
  posicaoPredio: number;
  comAndar: number;
  semCoordenada: number;
};

export const ADVERTISER_KEYS: Advertiser[] = ["agency", "person", "unknown"];

export const ADVERTISER_LABEL: Record<Advertiser, string> = {
  agency: "Imobiliária ou corretor",
  person: "Pessoa física",
  unknown: "Anunciante não identificado",
};

export const SELLER_KEYS: SellerRole[] = ["owner", "unspecified"];

export const SELLER_LABEL: Record<SellerRole, string> = {
  owner: "Proprietário",
  unspecified: "Não informado",
};

export const EMPTY_FILTERS: Filters = {
  agency: false,
  person: false,
  unknown: false,
};
