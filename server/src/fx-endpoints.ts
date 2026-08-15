/**
 * FX provider endpoints kept in one place so URL templates stay intact.
 */
const HTTPS = "https://";

export function frankfurterUrl(base: string, symbols: string[]): string {
  return HTTPS + "api.frankfurter.app/latest?from=" + encodeURIComponent(base) + "&to=" + symbols.join(",");
}

export function exchangerateHostUrl(base: string, symbols: string[]): string {
  return HTTPS + "api.exchangerate.host/latest?base=" + encodeURIComponent(base) + "&symbols=" + symbols.join(",");
}
