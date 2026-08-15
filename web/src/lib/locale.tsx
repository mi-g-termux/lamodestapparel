// Currency + delivery-country preference.
// Auto-detected from the visitor's browser locale on first visit (a shopper in
// the US lands on USD prices and a US delivery country), then remembered.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  countries,
  countryByCode,
  currencies,
  currencyByCode,
  detectCountryCode,
  type Country,
  type Currency,
} from "@/lib/regions";

const KEYS = { currency: "velora.currency", country: "velora.country" };

export function convert(usd: number, currency: Currency) {
  const raw = usd * currency.rate;
  if (currency.decimals === 0) return Math.round(raw);
  return Math.round(raw * 100) / 100;
}

export function formatMoney(usd: number, currency: Currency) {
  const value = convert(usd, currency);
  const body = value.toLocaleString("en-US", {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  });
  return `${currency.symbol}${body}`;
}

type LocaleValue = {
  ready: boolean;
  currency: Currency;
  country: Country;
  currencies: Currency[];
  countries: Country[];
  setCurrency: (code: string) => void;
  setCountry: (code: string) => void;
  /** Format a base-USD amount in the shopper's currency. */
  money: (usd: number) => string;
};

const LocaleContext = createContext<LocaleValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [countryCode, setCountryCode] = useState("US");

  useEffect(() => {
    const savedCountry = window.localStorage.getItem(KEYS.country);
    const savedCurrency = window.localStorage.getItem(KEYS.currency);
    const detected = savedCountry ?? detectCountryCode();
    setCountryCode(detected);
    setCurrencyCode(savedCurrency ?? countryByCode(detected).currency);
    setReady(true);
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyCode(code);
    try {
      window.localStorage.setItem(KEYS.currency, code);
    } catch {
      /* ignore */
    }
  }, []);

  const setCountry = useCallback((code: string) => {
    setCountryCode(code);
    try {
      window.localStorage.setItem(KEYS.country, code);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LocaleValue>(() => {
    const currency = currencyByCode(currencyCode);
    return {
      ready,
      currency,
      country: countryByCode(countryCode),
      currencies,
      countries,
      setCurrency,
      setCountry,
      money: (usd: number) => formatMoney(usd, currency),
    };
  }, [ready, currencyCode, countryCode, setCurrency, setCountry]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}

/** Convenience: just the formatter. */
export function useMoney() {
  return useLocale().money;
}