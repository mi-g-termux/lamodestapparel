/**
 * FX provider endpoints kept in one place so URL templates stay intact.
 */
const HTTPS = "https://";
export function frankfurterUrl(base, symbols) {
    return HTTPS + "api.frankfurter.app/latest?from=" + encodeURIComponent(base) + "&to=" + symbols.join(",");
}
export function exchangerateHostUrl(base, symbols) {
    return HTTPS + "api.exchangerate.host/latest?base=" + encodeURIComponent(base) + "&symbols=" + symbols.join(",");
}
//# sourceMappingURL=fx-endpoints.js.map