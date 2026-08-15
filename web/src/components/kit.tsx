// Small presentational kit shared by every page so buttons, inputs and panels
// stay identical across the theme. Styling only — no content lives here.
import { useState, type ReactNode } from "react";
import { PlusIcon, MinusIcon } from "@/components/icons";
import { useMoney } from "@/lib/locale";

const base =
  "inline-flex items-center justify-center gap-2 px-6 py-3 text-[11px] tracking-[0.18em] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-40";

export const btnPrimary = `${base} bg-ink text-primary-foreground hover:bg-ink/90`;
export const btnOutline = `${base} border border-ink text-foreground hover:bg-ink hover:text-primary-foreground`;
export const btnQuiet = `${base} border border-border bg-background text-muted-foreground hover:text-gold`;

export const inputClass =
  "w-full border border-border bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:border-gold focus:outline-none";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-[11px] text-destructive">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border border-border bg-background p-6 md:p-8 ${className}`}>{children}</div>
  );
}

export function Money({ value }: { value: number }) {
  const money = useMoney();
  return <span>{money(value)}</span>;
}

export function Accordion({
  items,
  defaultOpen = -1,
}: {
  items: { title: string; body: ReactNode }[];
  defaultOpen?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.title} className="border-b border-border">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-4 text-left text-[13px] tracking-[0.04em] hover:text-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {item.title}
              {isOpen ? <MinusIcon className="size-4" /> : <PlusIcon className="size-4" />}
            </button>
            {isOpen ? (
              <div className="pb-5 text-[13.5px] leading-relaxed text-muted-foreground">
                {item.body}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function QtyStepper({
  value,
  onChange,
  label = "Quantity",
}: {
  value: number;
  onChange: (n: number) => void;
  label?: string;
}) {
  return (
    <div className="inline-flex items-center border border-border" role="group" aria-label={label}>
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="grid size-10 place-items-center hover:text-gold"
      >
        <MinusIcon className="size-3.5" />
      </button>
      <span className="w-10 text-center text-[13px]">{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        className="grid size-10 place-items-center hover:text-gold"
      >
        <PlusIcon className="size-3.5" />
      </button>
    </div>
  );
}
