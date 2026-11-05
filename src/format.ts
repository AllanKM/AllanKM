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
