import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { site } from "@/content/site";
import { SiteShell, PageHeading, pageMeta } from "@/components/SiteShell";
import { btnPrimary, btnOutline } from "@/components/kit";
import { OrderQr } from "@/components/OrderQr";
import { useStore, orderStages, orderTimeline, formatStamp } from "@/lib/store";
import { formatMoney } from "@/lib/locale";
import { PackageCheck, PackageSearch, Truck, MapPin, CheckCircle2, type LucideIcon } from "lucide-react";

const stageIcons: LucideIcon[] = [PackageCheck, PackageSearch, Truck, MapPin, CheckCircle2];

export const Route = createFileRoute("/order/$id")({
  head: () => ({
    meta: [
      { title: "Order details — Velora" },
      { name: "description", content: "Your Velora order summary, invoice and delivery progress." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function OrderPage() {
  const { id } = Route.useParams();
  const { findOrder, hydrated, advanceOrder, reorder, openCart } = useStore();
  const order = findOrder(id);

  if (!hydrated) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-[1200px] px-6 py-24 text-center text-[13px] text-muted-foreground">
          Loading order…
        </div>
      </SiteShell>
    );
  }

  if (!order) {
    return (
      <SiteShell>
        <PageHeading title="Order not found" crumbs={[{ label: "Orders" }]} />
        <div className="mx-auto max-w-[1200px] px-6 py-16 text-center">
          <p className="text-[14px] text-muted-foreground">
            We couldn't find order {id} on this device.
          </p>
          <Link to="/track-order" className={`${btnPrimary} mt-6`}>
            Track an order
          </Link>
        </div>
      </SiteShell>
    );
  }

  const stageIndex = orderStages.indexOf(order.status);
  // Invoices are frozen in the currency the shopper paid in.
  const paid = {
    code: order.currency?.code ?? "USD",
    name: order.currency?.code ?? "USD",
    symbol: order.currency?.symbol ?? "$",
    rate: order.currency?.rate ?? 1,
    decimals: order.currency?.decimals ?? 2,
  };
  const money = (usd: number) => formatMoney(usd, paid);

  return (
    <SiteShell>
      <PageHeading
        eyebrow="Thank you"
        title={`Order ${order.id}`}
        body={`Placed ${fmtDate(order.createdAt)} · ${order.payment} · ${order.status}`}
        crumbs={[{ label: "Orders", href: "/orders" }, { label: order.id }]}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        {/* progress */}
        <section aria-label="Delivery progress">
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={orderStages.length}
            aria-valuenow={stageIndex + 1}
            aria-valuetext={`Step ${stageIndex + 1} of ${orderStages.length}: ${order.status}`}
            className="flex gap-1.5"
          >
            {orderStages.map((stage, i) => (
              <span
                key={stage}
                className={`h-[3px] flex-1 ${i <= stageIndex ? "bg-gold" : "bg-border"}`}
              />
            ))}
          </div>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {orderTimeline(order).map((step, i) => {
              const Icon = stageIcons[i] ?? PackageCheck;
              return (
                <li
                  key={step.stage}
                  aria-current={step.current ? "step" : undefined}
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3"
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full border ${
                      step.done ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                      Step {i + 1}
                    </span>
                    <span className={`block text-[13px] ${step.done ? "" : "text-muted-foreground"}`}>
                      {step.stage}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {step.done ? formatStamp(step.at) : "Pending"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
          {/* invoice */}
          <section id="invoice" className="print-area border border-border">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-cream px-6 py-5">
              <div>
                <p className="font-display text-[20px] tracking-[0.24em]">{site.brand.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{site.company.legalName}</p>
                <p className="text-[11px] text-muted-foreground">{site.company.address}</p>
                <p className="text-[11px] text-muted-foreground">VAT {site.company.vat}</p>
              </div>
              <div className="text-right">
                <p className="eyebrow text-gold">Invoice</p>
                <p className="mt-1 text-[13px]">{order.id}</p>
                <p className="text-[11px] text-muted-foreground">{fmtDate(order.createdAt)}</p>
              </div>
            </header>

            <div className="grid gap-6 border-b border-border px-6 py-5 sm:grid-cols-2">
              <div>
                <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Billed to</p>
                <p className="mt-2 text-[13px]">{order.address.name}</p>
                <p className="text-[12px] text-muted-foreground">{order.address.line1}</p>
                {order.address.line2 ? (
                  <p className="text-[12px] text-muted-foreground">{order.address.line2}</p>
                ) : null}
                <p className="text-[12px] text-muted-foreground">
                  {order.address.city}
                  {order.address.state ? `, ${order.address.state}` : ""} {order.address.postcode},{" "}
                  {order.address.country}
                </p>
                <p className="text-[12px] text-muted-foreground">{order.address.email}</p>
                {order.address.phone ? (
                  <p className="text-[12px] text-muted-foreground">
                    {order.address.dial} {order.address.phone}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:justify-items-end">
                <div className="min-w-0 sm:text-right">
                  <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Delivery</p>
                  <p className="mt-2 text-[13px]">{order.shippingMethod ?? order.carrier}</p>
                  <p className="text-[12px] text-muted-foreground">{order.carrier}</p>
                  <p className="text-[12px] text-muted-foreground">Tracking {order.trackingNumber}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {order.shippingWindow ? `Arrives ${order.shippingWindow}` : `Estimated ${fmtDate(order.eta)}`}
                  </p>
                </div>
                <OrderQr orderId={order.id} />
              </div>
            </div>

            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  <th className="px-6 py-3 font-normal">Item</th>
                  <th className="px-3 py-3 font-normal">Qty</th>
                  <th className="px-6 py-3 text-right font-normal">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.key} className="border-b border-border align-top">
                    <td className="px-6 py-4 text-[13px]">
                      {i.name}
                      <span className="block text-[11px] text-muted-foreground">
                        {i.color} · {i.size}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-[13px]">{i.qty}</td>
                    <td className="px-6 py-4 text-right text-[13px]">
                      {money(i.unitPrice * i.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end px-6 py-5">
              <dl className="w-full max-w-[260px] space-y-2.5 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{money(order.totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd>{order.totals.shipping === 0 ? "Free" : money(order.totals.shipping)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd>{money(order.totals.tax)}</dd>
                </div>
                <div className="flex justify-between border-t border-clay pt-2.5 text-[15px] font-medium">
                  <dt>Total paid</dt>
                  <dd>{money(order.totals.total)}</dd>
                </div>
              </dl>
            </div>

            <p className="border-t border-border bg-cream px-6 py-4 text-[11px] text-muted-foreground">
              Paid in {paid.code}. Thank you for shopping with {site.brand.name}. Questions?{" "}
              {site.company.email}
            </p>
          </section>

          <aside className="h-fit space-y-3">
            <button type="button" onClick={() => window.print()} className={`${btnPrimary} w-full`}>
              Print / save invoice
            </button>
            <button
              type="button"
              onClick={() => {
                const added = reorder(order.id);
                toast.success(`${added} ${added === 1 ? "line" : "lines"} added back to your bag`, {
                  action: { label: "View bag", onClick: openCart },
                });
              }}
              className={`${btnOutline} w-full`}
            >
              Reorder these items
            </button>
            <Link to="/track-order" className={`${btnOutline} w-full`}>
              Track this order
            </Link>
            <button type="button" onClick={() => advanceOrder(order.id)} className={`${btnOutline} w-full`}>
              Simulate next status
            </button>
            <Link to="/orders" className={`${btnOutline} w-full`}>
              All orders
            </Link>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
