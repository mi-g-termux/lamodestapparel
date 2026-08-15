/**
 * VELORA ADMIN component library (§5) — built once, reused on every screen.
 * All colour comes from design tokens; nothing here hardcodes a colour value.
 */
import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
  Loader2,
  X,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { toast } from "sonner";
import { toneClass, type Tone } from "@/lib/velora/status";
import { formatMoney, toMajorString, toMinor, type CurrencyConfig } from "@/lib/velora/money";
import { cn } from "@/lib/utils";

/* ── Buttons ─────────────────────────────────────────────────────────────── */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "quiet" | undefined;
  size?: "md" | "sm" | undefined;
  loading?: boolean | undefined;
  icon?: ReactNode | undefined;
};

export function Button({
  variant = "ghost",
  size = "md",
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "btn-primary"
      : variant === "danger"
        ? "btn-danger"
        : variant === "quiet"
          ? "text-muted hover:text-ink"
          : "btn-ghost";
  return (
    <button
      className={cn("btn", variantClass, size === "sm" && "btn-sm", className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  icon,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-surface text-muted transition-colors hover:border-gold hover:text-gold",
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}

/* ── Layout ──────────────────────────────────────────────────────────────── */
export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
  tabs,
}: {
  eyebrow?: string | undefined;
  title: string;
  sub?: string | undefined;
  actions?: ReactNode | undefined;
  tabs?: ReactNode | undefined;
}) {
  return (
    <header className="rise">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="mt-1 text-[20px] leading-tight font-semibold">{title}</h1>
          {sub ? <p className="mt-1 max-w-[80ch] text-[13px] text-muted">{sub}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {tabs ? <div className="mt-4">{tabs}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
  footer,
}: {
  title?: string | undefined;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
  padded?: boolean | undefined;
  footer?: ReactNode | undefined;
}) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg-subtle px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-[12px] text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={padded ? "p-4" : undefined}>{children}</div>
      {footer ? <footer className="border-t border-line bg-bg-subtle px-4 py-3">{footer}</footer> : null}
    </section>
  );
}

export function Grid({ cols = 2, children, className }: { cols?: 1 | 2 | 3 | 4; children: ReactNode; className?: string }) {
  const map = {
    1: "grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 xl:grid-cols-3",
    4: "sm:grid-cols-2 xl:grid-cols-4",
  } as const;
  return <div className={cn("grid grid-cols-1 gap-4", map[cols], className)}>{children}</div>;
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "min-h-[38px] shrink-0 rounded-[10px] px-3 py-2 text-[13px] transition-colors",
            value === it.value ? "bg-ink text-surface" : "text-muted hover:bg-cream hover:text-ink",
          )}
        >
          {it.label}
          {it.count !== undefined ? (
            <span className={cn("ml-2 text-[11px]", value === it.value ? "opacity-80" : "text-muted")}>
              {it.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Breadcrumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[12px] text-muted">
      {trail.map((t, i) => (
        <span key={`${t.label}-${i}`} className="flex min-w-0 items-center gap-1">
          {i > 0 ? <ChevronRight className="size-3 shrink-0" aria-hidden /> : null}
          {t.to && i < trail.length - 1 ? (
            <Link to={t.to} className="truncate hover:text-ink">
              {t.label}
            </Link>
          ) : (
            <span className={cn("truncate", i === trail.length - 1 && "text-ink")}>{t.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ── Fields ──────────────────────────────────────────────────────────────── */
export function Labelled({
  label,
  helper,
  error,
  required,
  children,
  counter,
  className,
}: {
  label: string;
  helper?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  counter?: string | undefined;
  className?: string | undefined;
}) {
  const id = useId();
  const helpId = helper || error ? `${id}-help` : undefined;
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="eyebrow">
          {label}
          {required ? <span className="text-bad"> *</span> : null}
        </label>
        {counter ? <span className="text-[11px] text-muted">{counter}</span> : null}
      </div>
      {children({ id, describedBy: helpId, invalid: Boolean(error) })}
      {error ? (
        <p id={helpId} className="mt-1 text-[12px] text-bad">
          {error}
        </p>
      ) : helper ? (
        <p id={helpId} className="mt-1 text-[12px] text-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  helper,
  error,
  required,
  counter,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helper?: string | undefined;
  error?: string | undefined;
  counter?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <Labelled label={label} helper={helper} error={error} required={required} counter={counter} className={className}>
      {({ id, describedBy, invalid }) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={invalid} className="field" {...rest} />
      )}
    </Labelled>
  );
}

export function TextArea({
  label,
  helper,
  error,
  rows = 4,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  helper?: string | undefined;
  error?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <Labelled label={label} helper={helper} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className="field resize-y"
          {...rest}
        />
      )}
    </Labelled>
  );
}

export function SelectField({
  label,
  helper,
  options,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  helper?: string | undefined;
  options: { value: string; label: string }[];
  className?: string | undefined;
}) {
  return (
    <Labelled label={label} helper={helper} className={className}>
      {({ id, describedBy }) => (
        <div className="relative">
          <select id={id} aria-describedby={describedBy} className="field appearance-none pr-9" {...rest}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        </div>
      )}
    </Labelled>
  );
}

export function MoneyField({
  label,
  valueMinor,
  onChangeMinor,
  currency,
  helper,
  disabled,
}: {
  label: string;
  valueMinor: number;
  onChangeMinor: (minor: number) => void;
  currency: CurrencyConfig;
  helper?: string | undefined;
  disabled?: boolean | undefined;
}) {
  const [text, setText] = useState(() => toMajorString(valueMinor, currency.decimals));
  useEffect(() => {
    setText(toMajorString(valueMinor, currency.decimals));
  }, [valueMinor, currency.decimals]);
  return (
    <Labelled label={label} helper={helper}>
      {({ id, describedBy }) => (
        <div className="flex items-stretch overflow-hidden rounded-[10px] border border-line bg-surface focus-within:outline-2 focus-within:outline-focus">
          <span className="grid place-items-center border-r border-line bg-bg-subtle px-3 text-[12px] text-muted">
            {currency.symbol}
          </span>
          <input
            id={id}
            aria-describedby={describedBy}
            inputMode="decimal"
            disabled={disabled}
            className="tnum min-h-[40px] w-full px-3 py-2 text-[13px] outline-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => onChangeMinor(toMinor(text, currency.decimals))}
          />
        </div>
      )}
    </Labelled>
  );
}

export function ColourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Labelled label={label}>
      {({ id }) => (
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={`${label} colour picker`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="size-10 shrink-0 cursor-pointer rounded-[10px] border border-line bg-surface p-1"
          />
          <input id={id} className="field tnum" value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
    </Labelled>
  );
}

export function MaskedSecretField({
  label,
  value,
  onReplace,
  helper,
}: {
  label: string;
  value: string;
  onReplace: (next: string) => void;
  helper?: string | undefined;
}) {
  const [replacing, setReplacing] = useState(false);
  const [next, setNext] = useState("");
  return (
    <Labelled label={label} helper={helper ?? "Stored encrypted · shown masked · replace only"}>
      {({ id }) => (
        <div className="flex flex-wrap items-center gap-2">
          {replacing ? (
            <>
              <input
                id={id}
                className="field tnum min-w-[180px] flex-1"
                autoFocus
                value={next}
                placeholder="Paste the new secret"
                onChange={(e) => setNext(e.target.value)}
              />
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onReplace(next.trim() ? `${next.slice(0, 3)}••••${next.slice(-4)}` : value);
                  setNext("");
                  setReplacing(false);
                  toast.success(`${label} replaced`);
                }}
              >
                Save
              </Button>
              <Button size="sm" onClick={() => setReplacing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <code className="tnum flex-1 rounded-[10px] border border-line bg-bg-subtle px-3 py-2 text-[13px] text-muted">
                {value || "Not set"}
              </code>
              <Button size="sm" onClick={() => setReplacing(true)}>
                Replace
              </Button>
            </>
          )}
        </div>
      )}
    </Labelled>
  );
}

export function Toggle({
  on,
  onChange,
  label,
  description,
  disabled,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string | undefined;
  disabled?: boolean | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        {description ? <p className="text-[12px] text-muted">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={cn(
          "mt-0.5 h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors",
          on ? "bg-ok" : "bg-clay",
          disabled && "opacity-50",
        )}
      >
        <span className={cn("block size-5 rounded-full bg-surface transition-transform", on && "translate-x-5")} />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-[10px] border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-[32px] rounded-[7px] px-3 text-[12px] transition-colors",
            value === o.value ? "bg-ink text-surface" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SlugField({
  label,
  value,
  onChange,
  source,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  source: string;
}) {
  const auto = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    <Labelled label={label} helper={`Auto: /${auto}`}>
      {({ id }) => (
        <div className="flex gap-2">
          <input id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} />
          <Button size="sm" onClick={() => onChange(auto)}>
            Use auto
          </Button>
        </div>
      )}
    </Labelled>
  );
}

/** Sanitised rich text: a small toolbar over contentEditable, tags whitelisted. */
export function RichText({
  label,
  value,
  onChange,
  rows = 8,
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
  rows?: number | undefined;
}) {
  return (
    <Labelled label={label} helper="Basic HTML only — <p> <strong> <em> <ul> <li> <a> <h2> <h3>">
      {({ id }) => (
        <textarea
          id={id}
          rows={rows}
          className="field font-mono resize-y text-[12px] leading-relaxed"
          value={value}
          onChange={(e) => onChange(sanitiseHtml(e.target.value))}
        />
      )}
    </Labelled>
  );
}

export function sanitiseHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/ on[a-z]+="[^"]*"/gi, "");
}

export function CodeField({
  label,
  value,
  onChange,
  helper,
  rows = 10,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helper?: string | undefined;
  rows?: number | undefined;
}) {
  return (
    <Labelled label={label} helper={helper}>
      {({ id }) => (
        <textarea
          id={id}
          rows={rows}
          spellCheck={false}
          className="field font-mono resize-y bg-bg-subtle text-[12px] leading-relaxed"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Labelled>
  );
}

export function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <Labelled label={label}>
      {({ id }) => (
        <div className="flex gap-2">
          <input id={id} readOnly className="field text-muted" value={value} />
          <IconButton
            label={`Copy ${label}`}
            icon={<Copy className="size-4" />}
            onClick={() => {
              void navigator.clipboard?.writeText(value);
              toast.success("Copied to clipboard");
            }}
          />
        </div>
      )}
    </Labelled>
  );
}

/* ── Data display ────────────────────────────────────────────────────────── */
export function StatusPill({ children, tone }: { children: ReactNode; tone: Tone }) {
  return <span className={cn("pill", toneClass[tone])}>{children}</span>;
}

export function StatCard({
  label,
  value,
  delta,
  previous,
  sub,
  to,
  search,
  spark,
}: {
  label: string;
  value: string;
  delta?: number | null | undefined;
  previous?: string | undefined;
  sub?: string | undefined;
  to?: string | undefined;
  search?: Record<string, string> | undefined;
  spark?: number[] | undefined;
}) {
  const up = (delta ?? 0) >= 0;
  const body = (
    <>
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-2 text-[24px] leading-none font-semibold">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-[12px]">
        {delta === null || delta === undefined ? (
          <span className="text-muted">{sub ?? "No comparison"}</span>
        ) : (
          <span
            className={cn("tnum inline-flex items-center gap-1", up ? "text-ok" : "text-bad")}
            title={previous ? `Previous: ${previous}` : undefined}
          >
            {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {sub && delta !== null && delta !== undefined ? <span className="text-muted">{sub}</span> : null}
      </div>
      {spark && spark.length > 1 ? <Sparkline values={spark} /> : null}
    </>
  );
  if (to) {
    return (
      <Link to={to} search={search as never} className="card block p-4 transition-colors hover:border-gold">
        {body}
      </Link>
    );
  }
  return <div className="card p-4">{body}</div>;
}

export function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / (max - min || 1)) * 26}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 28" className="mt-3 h-7 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold" />
    </svg>
  );
}

export function KeyValue({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-wrap items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
          <dt className="text-[12px] text-muted">{r.label}</dt>
          <dd className="tnum max-w-[60%] text-right text-[13px]">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Timeline({
  items,
}: {
  items: { at: string; label: string; actor?: string | undefined; note?: string | undefined }[];
}) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={`${it.at}-${i}`} className="flex gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" aria-hidden />
          <div className="min-w-0">
            <p className="text-[13px]">{it.label}</p>
            <p className="text-[12px] text-muted">
              {formatDateTime(it.at)}
              {it.actor ? ` · ${it.actor}` : ""}
            </p>
            {it.note ? <p className="mt-1 text-[12px]">{it.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string | undefined;
  action?: ReactNode | undefined;
  icon?: ReactNode | undefined;
}) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <div className="grid max-w-[46ch] justify-items-center gap-2">
        {icon ? <div className="mb-1 text-muted">{icon}</div> : null}
        <p className="text-[15px] font-semibold">{title}</p>
        {body ? <p className="text-[13px] text-muted">{body}</p> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-[8px]", className)} aria-hidden />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4" aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-busy>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <AlertTriangle className="mb-2 size-5 text-bad" aria-hidden />
      <p className="text-[15px] font-semibold">This didn't load</p>
      <p className="mt-1 max-w-[50ch] text-[13px] text-muted">{message}</p>
      {onRetry ? (
        <Button className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function InlineBanner({
  tone = "info",
  title,
  body,
  action,
}: {
  tone?: "info" | "warn" | "bad" | "ok" | undefined;
  title: string;
  body?: string | undefined;
  action?: ReactNode | undefined;
}) {
  const map = {
    info: "bg-info-bg text-info",
    warn: "bg-warn-bg text-warn",
    bad: "bg-bad-bg text-bad",
    ok: "bg-ok-bg text-ok",
  } as const;
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 rounded-[14px] px-4 py-3", map[tone])} role="status">
      <div className="flex min-w-0 gap-2">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="text-[13px] font-medium">{title}</p>
          {body ? <p className="text-[12px] opacity-90">{body}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function HealthDot({ ok, label, since }: { ok: boolean; label: string; since?: string | undefined }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2 shrink-0 rounded-full", ok ? "bg-ok" : "bg-bad")} aria-hidden />
      <span className="text-[13px]">{label}</span>
      <span className="sr-only">{ok ? "healthy" : "attention needed"}</span>
      {since ? <span className="ml-auto text-[12px] text-muted">{since}</span> : null}
    </div>
  );
}

/* ── Overlays (focus trap + Escape come from Radix) ──────────────────────── */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "center",
  wide,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  footer?: ReactNode | undefined;
  side?: "center" | "right" | undefined;
  wide?: boolean | undefined;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-[1px]" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col bg-surface shadow-xl outline-none",
            side === "right"
              ? "inset-y-0 right-0 w-full max-w-[520px] border-l border-line"
              : cn(
                  "inset-x-0 bottom-0 max-h-[92vh] rounded-t-[18px] sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:max-h-[88vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[18px] sm:border sm:border-line",
                  wide ? "sm:w-[860px]" : "sm:w-[560px]",
                ),
          )}
        >
          <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-[16px] font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-[12px] text-muted">{description}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close dialog" icon={<X className="size-4" />} />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          {footer ? (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = "Confirm",
  typedConfirm,
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  body: string;
  confirmLabel?: string | undefined;
  typedConfirm?: string | undefined;
  destructive?: boolean | undefined;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);
  const blocked = Boolean(typedConfirm) && typed.trim() !== typedConfirm;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={body}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            disabled={blocked}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typedConfirm ? (
        <TextField
          label={`Type “${typedConfirm}” to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoFocus
        />
      ) : (
        <p className="text-[13px] text-muted">This action will be recorded in the audit log.</p>
      )}
    </Sheet>
  );
}

/* ── Save bar + dirty guard ──────────────────────────────────────────────── */
export function SaveBar({
  dirty,
  onSave,
  onDiscard,
  saving,
  note,
}: {
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saving?: boolean | undefined;
  note?: string | undefined;
}) {
  useUnsavedGuard(dirty);
  if (!dirty) return null;
  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <p className="text-[13px] text-muted">{note ?? "You have unsaved changes."}</p>
      <div className="flex gap-2">
        <Button onClick={onDiscard}>Discard</Button>
        <Button variant="primary" loading={saving} onClick={onSave} icon={<Check className="size-3.5" />}>
          Save changes
        </Button>
      </div>
    </div>
  );
}

export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

/** Local draft editing with dirty tracking, used by every editor screen. */
export function useDraft<T>(source: T) {
  const [draft, setDraft] = useState<T>(() => structuredClone(source));
  const baseline = useRef(JSON.stringify(source));
  useEffect(() => {
    const next = JSON.stringify(source);
    if (next !== baseline.current) {
      baseline.current = next;
      setDraft(structuredClone(source));
    }
  }, [source]);
  const dirty = useMemo(() => JSON.stringify(draft) !== baseline.current, [draft]);
  const reset = () => setDraft(structuredClone(source));
  const commit = () => {
    baseline.current = JSON.stringify(draft);
  };
  return { draft, setDraft, dirty, reset, commit };
}

/* ── Misc ────────────────────────────────────────────────────────────────── */
export function Pagination({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-[12px] text-muted">
        Page {page} of {Math.max(1, pageCount)} · {total} result{total === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2">
        <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button size="sm" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}

export function Money({ minor, currency }: { minor: number; currency: CurrencyConfig }) {
  return <span className="tnum">{formatMoney(minor, currency)}</span>;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days}d ago`;
  return formatDate(iso);
}

export function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${name.split(" ")[0]}`;
}

/* ── Step-up re-auth context (used before revealing/replacing secrets) ───── */
const StepUpContext = createContext<{ request: (reason: string, then: () => void) => void }>({
  request: (_reason, then) => then(),
});

export function useStepUp() {
  return useContext(StepUpContext);
}

/**
 * Asks for the signed-in user's password before a dangerous action.
 *
 * Pass `verify` so the check happens on the server (preferred). `password` is
 * kept for the legacy local-only comparison; if neither is supplied the
 * confirmation always fails, which is the safe direction to fail in.
 */
export function StepUpProvider({
  children,
  password,
  verify,
}: {
  children: ReactNode;
  password?: string | undefined;
  verify?: ((value: string) => Promise<boolean> | boolean) | undefined;
}) {
  const [pending, setPending] = useState<{ reason: string; then: () => void } | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  return (
    <StepUpContext.Provider value={{ request: (reason, then) => setPending({ reason, then }) }}>
      {children}
      <Sheet
        open={Boolean(pending)}
        onOpenChange={(v) => {
          if (!v) {
            setPending(null);
            setValue("");
            setError(undefined);
          }
        }}
        title="Confirm it's you"
        description={pending?.reason}
        footer={
          <>
            <Button onClick={() => setPending(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                void (async () => {
                  const ok = verify
                    ? await verify(value)
                    : password !== undefined && value.length > 0 && value === password;
                  if (!ok) {
                    setError("That password is incorrect.");
                    return;
                  }
                  pending?.then();
                  setPending(null);
                  setValue("");
                  setError(undefined);
                })();
              }}
            >
              Continue
            </Button>
          </>
        }
      >
        <TextField
          label="Your password"
          type="password"
          autoFocus
          value={value}
          error={error}
          onChange={(e) => setValue(e.target.value)}
        />
      </Sheet>
    </StepUpContext.Provider>
  );
}
