const numberFormat = new Intl.NumberFormat("pt-BR");
const priceFormat = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatPrice(value: number): string {
  return priceFormat.format(value);
}

export function formatFloor(floor: number): string {
  if (floor <= 0) return "Térreo";
  return `${floor}º andar`;
}

export function formatListingPrice(price: number, rent: boolean): string {
  return rent ? `${formatPrice(price)} /mês` : formatPrice(price);
}

export function formatIndex(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number): string {
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(value) * 100);
  if (value > 0.0000001) return `+${formatted}%`;
  if (value < -0.0000001) return `−${formatted}%`;
  return `${formatted}%`;
}

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function formatMonth(year: number, month: number): string {
  return `${MONTHS_SHORT[month - 1]}/${year}`;
}

export function formatMonthLong(year: number, month: number): string {
  return `${MONTHS_LONG[month - 1]} de ${year}`;
}

export function formatRooms(bedrooms: number): string {
  return bedrooms === 1 ? "1 quarto" : `${bedrooms} quartos`;
}
