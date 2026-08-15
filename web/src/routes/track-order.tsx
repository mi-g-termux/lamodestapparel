import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageHeading, pageMeta } from "@/components/SiteShell";
import { Field, inputClass, btnPrimary } from "@/components/kit";
import { useStore, orderStages, orderTimeline, formatStamp, type Order } from "@/lib/store";
import {
  PackageCheck,
  PackageSearch,
  Truck,
  MapPin,
  CheckCircle2,
  Search,
  PackageX,
  Receipt,
  type LucideIcon,
} from "lucide-react";

const stageIcons: LucideIcon[] = [PackageCheck, PackageSearch, Truck, MapPin, CheckCircle2];

export const Route = createFileRoute("/track-order")({
  head: () =>
    pageMeta("Track Order", "Enter your Velora order number to follow your parcel from packing to delivery."),
  component: TrackPage,
});

function TrackPage() {
  const { findOrder, orders } = useStore();
  const [id, setId] = useState("");
  const [result, setResult] = useState<Order | null | undefined>(undefined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(findOrder(id.trim()) ?? null);
  };

  return (
    <SiteShell>
      <PageHeading
        eyebrow="Delivery"
        title="Track your order"
        body="Enter the order number from your confirmation email — for example VLR-482910."
        crumbs={[{ label: "Track Order" }]}
      />

      <div className="mx-auto max-w-[820px] px-6 py-10 md:py-14">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Field label="Order number">
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="VLR-000000"
              className={inputClass}
            />
          </Field>
          <button type="submit" className={btnPrimary}>
            <Search className="size-3.5" aria-hidden />
            Track
          </button>
        </form>

        {result === null ? (
          <p className="mt-8 flex items-center gap-3 border border-border bg-cream px-5 py-4 text-[13px]">
            <PackageX className="size-4 shrink-0 text-gold" aria-hidden />
            No order found with that number on this device.
          </p>
        ) : null}

        {result ? (
          <div className="mt-8 border border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-cream px-6 py-4">
              <p className="text-[14px]">{result.id}</p>
              <p className="text-[12px] text-muted-foreground">
                {result.carrier} · {result.trackingNumber}
              </p>
            </div>
            <div className="px-6 pt-5">
              <div
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={orderStages.length}
                aria-valuenow={orderStages.indexOf(result.status) + 1}
                aria-valuetext={`Step ${orderStages.indexOf(result.status) + 1} of ${orderStages.length}: ${result.status}`}
                className="flex gap-1.5"
              >
                {orderStages.map((stage, i) => (
                  <span
                    key={stage}
                    className={`h-[3px] flex-1 ${
                      i <= orderStages.indexOf(result.status) ? "bg-gold" : "bg-border"
                    }`}
                  />
                ))}
              </div>
            </div>
            <ol className="px-6 py-6">
              {orderTimeline(result).map((step, i) => {
                const Icon = stageIcons[i] ?? PackageCheck;
                return (
                  <li
                    key={step.stage}
                    aria-current={step.current ? "step" : undefined}
                    className="flex gap-4 pb-6 last:pb-0"
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full border ${
                          step.done ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground"
                        }`}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      {i < orderStages.length - 1 ? (
                        <span className={`mt-1 w-px flex-1 ${step.done ? "bg-gold/50" : "bg-border"}`} />
                      ) : null}
                    </div>
                    <div className="min-w-0 pt-1">
                      <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                        Step {i + 1} of {orderStages.length}
                      </p>
                      <p className={`text-[13.5px] ${step.done ? "" : "text-muted-foreground"}`}>
                        {step.stage}
                      </p>
                      <p className="text-[12px] text-muted-foreground">{step.detail}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {step.done ? formatStamp(step.at) : "Pending"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="border-t border-border px-6 py-4">
              <Link
                to="/order/$id"
                params={{ id: result.id }}
                className="inline-flex items-center gap-2 text-[12px] underline hover:text-gold"
              >
                <Receipt className="size-3.5" aria-hidden />
                View invoice
              </Link>
            </div>
          </div>
        ) : null}

        {orders.length > 0 ? (
          <div className="mt-12">
            <h2 className="section-title">Recent orders on this device</h2>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-4 py-4 text-[13px]">
                  <Link to="/order/$id" params={{ id: o.id }} className="hover:text-gold">
                    {o.id}
                  </Link>
                  <span className="text-[12px] text-muted-foreground">{o.status}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SiteShell>
  );
}
