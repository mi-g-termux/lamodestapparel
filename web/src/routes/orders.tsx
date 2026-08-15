import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { SiteShell, PageHeading, pageMeta } from "@/components/SiteShell";
import { btnPrimary, btnOutline, btnQuiet } from "@/components/kit";
import { useStore, orderStages } from "@/lib/store";
import { useMoney } from "@/lib/locale";
import { formatMoney } from "@/lib/locale";

export const Route = createFileRoute("/orders")({
  head: () =>
    pageMeta(
      "Order History",
      "Every Velora order in one place — reorder a past purchase in one tap and open or print the invoice.",
    ),
  component: OrdersPage,
});

const filters = ["All", "Open", "Delivered"] as const;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function OrdersPage() {
  const { orders, hydrated, reorder, openCart } = useStore();
  const money = useMoney();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const list = useMemo(
    () =>
      orders.filter((o) =>
        filter === "All" ? true : filter === "Delivered" ? o.status === "Delivered" : o.status !== "Delivered",
      ),
    [orders, filter],
  );

  const handleReorder = (id: string) => {
    const added = reorder(id);
    if (added === 0) {
      toast.error("Those pieces are no longer available.");
      return;
    }
    toast.success(`${added} ${added === 1 ? "line" : "lines"} added back to your bag`, {
      action: { label: "View bag", onClick: openCart },
    });
  };

  return (
    <SiteShell>
      <PageHeading
        title="Order History"
        body="Reorder a past purchase in one tap, or open the invoice with its order QR code."
        crumbs={[{ label: "Account", href: "/account" }, { label: "Orders" }]}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        {!hydrated ? (
          <p className="text-[13px] text-muted-foreground">Loading your orders…</p>
        ) : orders.length === 0 ? (
          <div className="border border-border px-6 py-20 text-center">
            <p className="font-display text-[24px]">No orders yet.</p>
            <p className="mx-auto mt-2 max-w-[46ch] text-[13px] text-muted-foreground">
              Once you place an order it appears here with its invoice, tracking and a one-tap reorder.
            </p>
            <Link to="/shop" className={`${btnPrimary} mt-6`}>
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b border-border pb-4">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`shrink-0 px-4 py-2 text-[11px] tracking-[0.16em] uppercase transition-colors ${
                    filter === f
                      ? "bg-ink text-primary-foreground"
                      : "border border-border hover:border-gold hover:text-gold"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <ul className="mt-6 space-y-5">
              {list.map((o) => {
                const step = orderStages.indexOf(o.status) + 1;
                return (
                  <li key={o.id} className="border border-border">
                    <div className="grid gap-4 border-b border-border bg-cream px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="text-[14px]">{o.id}</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {fmtDate(o.createdAt)} · {o.items.length} {o.items.length === 1 ? "line" : "lines"} ·{" "}
                          {o.payment}
                        </p>
                        <p className="mt-1 text-[11px] tracking-[0.12em] text-gold uppercase">
                          {o.status} · step {step} of {orderStages.length}
                        </p>
                      </div>
                      <p className="text-[15px] font-medium sm:text-right">
                        {formatMoney(o.totals.total, {
                          code: o.currency?.code ?? "USD",
                          symbol: o.currency?.symbol ?? "$",
                          rate: o.currency?.rate ?? 1,
                          decimals: o.currency?.decimals ?? 2,
                          name: o.currency?.code ?? "USD",
                        })}
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          now {money(o.totals.total)}
                        </span>
                      </p>
                    </div>

                    <ul className="divide-y divide-border px-5">
                      {o.items.map((i) => (
                        <li key={i.key} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 py-4">
                          <Link to="/product/$slug" params={{ slug: i.slug }} className="block bg-cream">
                            <img
                              src={i.image}
                              alt={i.name}
                              width={56}
                              height={70}
                              loading="lazy"
                              className="aspect-[4/5] w-14 object-cover"
                            />
                          </Link>
                          <div className="min-w-0">
                            <Link
                              to="/product/$slug"
                              params={{ slug: i.slug }}
                              className="block truncate text-[13px] hover:text-gold"
                            >
                              {i.name}
                            </Link>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {i.color} · {i.size} · Qty {i.qty}
                            </p>
                          </div>
                          <p className="shrink-0 text-[13px]">{money(i.unitPrice * i.qty)}</p>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
                      <button type="button" onClick={() => handleReorder(o.id)} className={btnPrimary}>
                        Reorder
                      </button>
                      <Link to="/order/$id" params={{ id: o.id }} className={btnOutline}>
                        View invoice
                      </Link>
                      <Link to="/track-order" className={btnQuiet}>
                        Track
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>

            {list.length === 0 ? (
              <p className="mt-6 border border-border px-5 py-10 text-center text-[13px] text-muted-foreground">
                No {filter.toLowerCase()} orders.
              </p>
            ) : null}
          </>
        )}
      </div>
    </SiteShell>
  );
}
