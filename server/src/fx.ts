import { query, one } from "./db.js";
import { getNamespace } from "./settings.js";
import { frankfurterUrl, exchangerateHostUrl } from "./fx-endpoints.js";

/**
 * Multi-currency.
 *
 * Rule: prices are STORED once, in the store base currency (e.g. GBP), as
 * integer minor units. A visitor from the US sees the same product converted
 * to USD at the live rate. Nothing is ever re-typed by the admin.
 */

export const CURRENCY_META: Record<string, { symbol: string; decimals: number; name: string }> = {
  USD: { symbol: "$", decimals: 2, name: "US Dollar" },
  GBP: { symbol: "\u00a3", decimals: 2, name: "British Pound" },
  EUR: { symbol: "\u20ac", decimals: 2, name: "Euro" },
  CAD: { symbol: "CA$", decimals: 2, name: "Canadian Dollar" },
  AUD: { symbol: "A$", decimals: 2, name: "Australian Dollar" },
  NZD: { symbol: "NZ$", decimals: 2, name: "New Zealand Dollar" },
  JPY: { symbol: "\u00a5", decimals: 0, name: "Japanese Yen" },
  CNY: { symbol: "CN\u00a5", decimals: 2, name: "Chinese Yuan" },
  INR: { symbol: "\u20b9", decimals: 2, name: "Indian Rupee" },
  BDT: { symbol: "\u09f3", decimals: 2, name: "Bangladeshi Taka" },
  PKR: { symbol: "\u20a8", decimals: 2, name: "Pakistani Rupee" },
  AED: { symbol: "AED", decimals: 2, name: "UAE Dirham" },
  SAR: { symbol: "SAR", decimals: 2, name: "Saudi Riyal" },
  CHF: { symbol: "CHF", decimals: 2, name: "Swiss Franc" },
  SEK: { symbol: "kr", decimals: 2, name: "Swedish Krona" },
  NOK: { symbol: "kr", decimals: 2, name: "Norwegian Krone" },
  DKK: { symbol: "kr", decimals: 2, name: "Danish Krone" },
  PLN: { symbol: "z\u0142", decimals: 2, name: "Polish Z\u0142oty" },
  ZAR: { symbol: "R", decimals: 2, name: "South African Rand" },
  SGD: { symbol: "S$", decimals: 2, name: "Singapore Dollar" },
  HKD: { symbol: "HK$", decimals: 2, name: "Hong Kong Dollar" },
  MYR: { symbol: "RM", decimals: 2, name: "Malaysian Ringgit" },
  TRY: { symbol: "\u20ba", decimals: 2, name: "Turkish Lira" },
  BRL: { symbol: "R$", decimals: 2, name: "Brazilian Real" },
  MXN: { symbol: "MX$", decimals: 2, name: "Mexican Peso" },
  NGN: { symbol: "\u20a6", decimals: 2, name: "Nigerian Naira" },
  KES: { symbol: "KSh", decimals: 2, name: "Kenyan Shilling" },
  EGP: { symbol: "E\u00a3", decimals: 2, name: "Egyptian Pound" },
  IDR: { symbol: "Rp", decimals: 0, name: "Indonesian Rupiah" },
  PHP: { symbol: "\u20b1", decimals: 2, name: "Philippine Peso" },
  THB: { symbol: "\u0e3f", decimals: 2, name: "Thai Baht" },
  VND: { symbol: "\u20ab", decimals: 0, name: "Vietnamese Dong" },
  KRW: { symbol: "\u20a9", decimals: 0, name: "South Korean Won" },
  ILS: { symbol: "\u20aa", decimals: 2, name: "Israeli Shekel" },
  CZK: { symbol: "K\u010d", decimals: 2, name: "Czech Koruna" },
  RON: { symbol: "lei", decimals: 2, name: "Romanian Leu" },
  HUF: { symbol: "Ft", decimals: 2, name: "Hungarian Forint" },
};

/** Country → currency. Anything unlisted falls back to the store base. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", UK: "GBP", CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY",
  CN: "CNY", IN: "INR", BD: "BDT", PK: "PKR", AE: "AED", SA: "SAR", CH: "CHF",
  SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", ZA: "ZAR", SG: "SGD", HK: "HKD",
  MY: "MYR", TR: "TRY", BR: "BRL", MX: "MXN", NG: "NGN", KE: "KES", EG: "EGP",
  ID: "IDR", PH: "PHP", TH: "THB", VN: "VND", KR: "KRW", IL: "ILS", CZ: "CZK",
  RO: "RON", HU: "HUF",
  // Eurozone
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR",
  IE: "EUR", PT: "EUR", FI: "EUR", GR: "EUR", SK: "EUR", SI: "EUR", LT: "EUR",
  LV: "EUR", EE: "EUR", LU: "EUR", CY: "EUR", MT: "EUR", HR: "EUR",
};

/** Resolve the visitor's country from CDN/proxy headers (Vercel, CF, LiteSpeed). */
export function countryFromHeaders(headers: Record<string, unknown>): string | null {
  const pick = (k: string): string | null => {
    const v = headers[k];
    const s = Array.isArray(v) ? v[0] : v;
    return typeof s === "string" && s.length === 2 ? s.toUpperCase() : null;
  };
  return (
    pick("x-vercel-ip-country") ??
    pick("cf-ipcountry") ??
    pick("x-country-code") ??
    pick("x-geoip-country") ??
    pick("x-appengine-country")
  );
}

export function currencyForCountry(country: string | null, base: string): string {
  if (!country) return base;
  return COUNTRY_CURRENCY[country.toUpperCase()] ?? base;
}

/* ------------------------------------------------------------------ *
 * Rates
 * ------------------------------------------------------------------ */

export async function getRate(base: string, quote: string): Promise<number> {
  if (base === quote) return 1;
  const row = await one<{ rate: number }>(
    `select rate from exchange_rates where base = $1 and quote = $2`,
    [base, quote],
  );
  if (row?.rate) return Number(row.rate);

  // Try the inverse pair before giving up.
  const inv = await one<{ rate: number }>(
    `select rate from exchange_rates where base = $1 and quote = $2`,
    [quote, base],
  );
  if (inv?.rate && Number(inv.rate) !== 0) return 1 / Number(inv.rate);

  return 1; // never break a page over a missing rate
}

export async function getAllRates(base: string): Promise<Record<string, number>> {
  const rows = await query<{ quote: string; rate: number }>(
    `select quote, rate from exchange_rates where base = $1`,
    [base],
  );
  const out: Record<string, number> = { [base]: 1 };
  for (const r of rows) out[r.quote] = Number(r.rate);
  return out;
}

/**
 * Refresh rates from a free provider (no API key needed).
 * Called on boot, hourly by cron, and by the "Refresh now" button in admin.
 */
export async function refreshRates(): Promise<{ ok: boolean; count: number; error?: string }> {
  const cfg = await getNamespace<Record<string, unknown>>("currency");
  const base = String(cfg.base ?? "GBP");
  const provider = String(cfg.provider ?? "frankfurter");
  const markup = Number(cfg.markup_percent ?? 0) / 100;

  if (provider === "manual") return { ok: true, count: 0 };

  const symbols = Object.keys(CURRENCY_META).filter((c) => c !== base);
  const url =
    provider === "exchangerate_host"
      ? exchangerateHostUrl(base, symbols)
      : frankfurterUrl(base, symbols);

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10_000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`provider returned ${res.status}`);
    const body = (await res.json()) as { rates?: Record<string, number> };
    const rates = body.rates ?? {};
    let count = 0;
    for (const [quote, rate] of Object.entries(rates)) {
      if (!Number.isFinite(rate) || rate <= 0) continue;
      const adjusted = rate * (1 + markup);
      await query(
        `insert into exchange_rates (base, quote, rate, source, fetched_at)
         values ($1,$2,$3,$4, now())
         on conflict (base, quote)
         do update set rate = excluded.rate, source = excluded.source, fetched_at = now()`,
        [base, quote, adjusted, provider],
      );
      count++;
    }
    return { ok: true, count };
  } catch (err) {
    console.warn("[fx] refresh failed:", (err as Error).message);
    return { ok: false, count: 0, error: (err as Error).message };
  }
}

/* ------------------------------------------------------------------ *
 * Conversion & formatting
 * ------------------------------------------------------------------ */

export function applyRounding(amount: number, mode: string): number {
  switch (mode) {
    case "whole":
      return Math.round(amount);
    case "0.99":
      return Math.floor(amount) + 0.99;
    case "0.95":
      return Math.floor(amount) + 0.95;
    default:
      return amount;
  }
}

/** Convert integer minor units from base currency into a target currency. */
export function convertMinor(
  minor: number,
  rate: number,
  fromDecimals: number,
  toDecimals: number,
  rounding = "none",
): number {
  const major = minor / 10 ** fromDecimals;
  const converted = applyRounding(major * rate, rounding);
  return Math.round(converted * 10 ** toDecimals);
}

export function formatMoney(
  minor: number,
  currency: string,
  opts: { position?: string; thousands?: string; decimalSep?: string } = {},
): string {
  const meta = CURRENCY_META[currency] ?? { symbol: currency + " ", decimals: 2, name: currency };
  const { position = "before", thousands = ",", decimalSep = "." } = opts;
  const negative = minor < 0;
  const value = Math.abs(minor) / 10 ** meta.decimals;
  const [intPart, decPart = ""] = value.toFixed(meta.decimals).split(".");
  const grouped = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  const num = meta.decimals > 0 ? `${grouped}${decimalSep}${decPart}` : grouped;
  const body = position === "after" ? `${num}\u00a0${meta.symbol}` : `${meta.symbol}${num}`;
  return negative ? `-${body}` : body;
}

/** Everything the storefront needs to price a page in the visitor's money. */
export type PricingContext = {
  base: string;
  display: string;
  rate: number;
  baseDecimals: number;
  displayDecimals: number;
  symbol: string;
  rounding: string;
};

export async function pricingContext(
  requested: string | null,
  country: string | null,
): Promise<PricingContext> {
  const cfg = await getNamespace<Record<string, unknown>>("currency");
  const base = String(cfg.base ?? "GBP");
  const multi = cfg.auto_detect_country !== false;

  let display = base;
  if (requested && CURRENCY_META[requested] && cfg.allow_manual_switch !== false) {
    display = requested;
  } else if (multi) {
    display = currencyForCountry(country, base);
  }
  if (!CURRENCY_META[display]) display = base;

  const rate = await getRate(base, display);
  return {
    base,
    display,
    rate,
    baseDecimals: CURRENCY_META[base]?.decimals ?? 2,
    displayDecimals: CURRENCY_META[display]?.decimals ?? 2,
    symbol: CURRENCY_META[display]?.symbol ?? display,
    rounding: String(cfg.rounding ?? "none"),
  };
}

/** Convenience: base minor → { minor, formatted } in the visitor's currency. */
export function present(minor: number, ctx: PricingContext): { minor: number; formatted: string } {
  const converted = convertMinor(minor, ctx.rate, ctx.baseDecimals, ctx.displayDecimals, ctx.rounding);
  return { minor: converted, formatted: formatMoney(converted, ctx.display) };
}
