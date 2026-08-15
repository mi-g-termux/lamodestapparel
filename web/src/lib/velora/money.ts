/**
 * Money is ALWAYS integer minor units (4999 === $49.99). §2.3
 * Formatting happens only at render, using the store's currency settings.
 */
export type Minor = number;

export type CurrencyConfig = {
  code: string;
  symbol: string;
  decimals: number;
  position: "before" | "after";
  thousands: string;
  decimalSep: string;
};

export const defaultCurrency: CurrencyConfig = {
  code: "USD",
  symbol: "$",
  decimals: 2,
  position: "before",
  thousands: ",",
  decimalSep: ".",
};

export function formatMoney(minor: Minor, c: CurrencyConfig = defaultCurrency): string {
  const neg = minor < 0;
  const abs = Math.abs(Math.round(minor));
  const factor = 10 ** c.decimals;
  const whole = Math.floor(abs / factor);
  const frac = abs % factor;
  const wholeStr = whole.toLocaleString("en-US").replace(/,/g, c.thousands);
  const body =
    c.decimals > 0 ? `${wholeStr}${c.decimalSep}${String(frac).padStart(c.decimals, "0")}` : wholeStr;
  const withSymbol = c.position === "before" ? `${c.symbol}${body}` : `${body}${c.symbol}`;
  return neg ? `−${withSymbol}` : withSymbol;
}

/** Parse a human string ("49.99") into minor units. */
export function toMinor(input: string | number, decimals = 2): Minor {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10 ** decimals);
}

/** Render minor units into an editable major-unit string. */
export function toMajorString(minor: Minor, decimals = 2): string {
  if (!Number.isFinite(minor)) return "";
  return (minor / 10 ** decimals).toFixed(decimals);
}

/** Percentages are stored in basis points (1250 === 12.50%). */
export function bpsOf(minor: Minor, bps: number): Minor {
  return Math.round((minor * bps) / 10000);
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}

export function formatPct(value: number, digits = 1): string {
  return `${value >= 0 ? "" : "−"}${Math.abs(value).toFixed(digits)}%`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
