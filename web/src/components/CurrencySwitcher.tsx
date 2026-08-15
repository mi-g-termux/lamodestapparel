import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/locale";
import { CloseIcon } from "@/components/icons";

/**
 * Currency + delivery-country picker. Defaults to the visitor's region, so a
 * shopper in the US sees USD prices and a US delivery country automatically.
 */
export function CurrencySwitcher({ variant = "header" }: { variant?: "header" | "block" }) {
  const { currency, country, currencies, countries, setCurrency, setCountry } = useLocale();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selects = (
    <div className="grid gap-3">
      <label className="block">
        <span className="mb-1.5 block text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Currency
        </span>
        <select
          value={currency.code}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full border border-border bg-background px-3 py-2.5 text-[13px] focus:border-gold focus:outline-none"
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name} ({c.symbol.trim()})
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Deliver to
        </span>
        <select
          value={country.code}
          onChange={(e) => {
            setCountry(e.target.value);
            const next = countries.find((c) => c.code === e.target.value);
            if (next) setCurrency(next.currency);
          }}
          className="w-full border border-border bg-background px-3 py-2.5 text-[13px] focus:border-gold focus:outline-none"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  if (variant === "block") {
    return (
      <div className="w-full max-w-[420px]">
        {selects}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Prices convert from USD at today's indicative rate. Your delivery country pre-fills at
          checkout and sets the shipping fee.
        </p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Change currency and delivery country. Current: ${currency.code}, ${country.name}`}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] tracking-[0.06em] transition-colors hover:bg-cream focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span aria-hidden>{country.flag}</span>
        <span>{currency.code}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Currency and delivery country"
          className="absolute right-0 z-50 mt-2 w-[min(88vw,300px)] border border-border bg-background p-4 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] tracking-[0.14em] uppercase">Region & currency</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close region picker"
              className="grid size-7 place-items-center rounded-full hover:bg-cream"
            >
              <CloseIcon className="size-4" aria-hidden />
            </button>
          </div>
          {selects}
        </div>
      ) : null}
    </div>
  );
}
