import { createFileRoute, Link } from "@tanstack/react-router";
import { site } from "@/content/site";
import { useMoney } from "@/lib/locale";
import { SiteShell, PageHeading, pageMeta } from "@/components/SiteShell";
import { QtyStepper, btnPrimary, btnOutline } from "@/components/kit";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () =>
    pageMeta("Shopping Bag", "Review the pieces in your Velora bag and continue to secure checkout."),
  component: CartPage,
});

function CartPage() {
  const money = useMoney();
  const copy = site.cartPage;
  const { cart, totals, setQty, removeItem, toggleWishlist } = useStore();

  const remaining = Math.max(0, copy.freeShippingThreshold - totals.subtotal);
  const progress = Math.min(100, (totals.subtotal / copy.freeShippingThreshold) * 100);

  return (
    <SiteShell>
      <PageHeading title={copy.title} crumbs={[{ label: copy.title }]} />

      <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        {cart.length === 0 ? (
          <div className="border border-border py-20 text-center">
            <p className="font-display text-[24px]">{copy.empty}</p>
            <Link to="/shop" className={`${btnPrimary} mt-6`}>
              {copy.emptyCta}
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
            <div>
              <div className="border border-clay bg-cream px-5 py-4">
                <p className="text-[12px]">
                  {remaining > 0
                    ? `You're ${money(remaining)} away from free shipping.`
                    : "Free shipping unlocked."}
                </p>
                <div className="mt-2.5 h-[3px] w-full bg-clay/50">
                  <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <ul className="mt-6 divide-y divide-border border-y border-border">
                {cart.map((item) => (
                  <li key={item.key} className="flex gap-4 py-6">
                    <Link
                      to="/product/$slug"
                      params={{ slug: item.slug }}
                      className="w-[92px] shrink-0 overflow-hidden bg-cream sm:w-[112px]"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        width={300}
                        height={375}
                        className="aspect-[4/5] w-full object-cover"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-sans text-[14px]">
                            <Link
                              to="/product/$slug"
                              params={{ slug: item.slug }}
                              className="hover:text-gold"
                            >
                              {item.name}
                            </Link>
                          </h2>
                          <p className="mt-1 text-[12px] text-muted-foreground">
                            {item.color} · {item.size}
                          </p>
                        </div>
                        <p className="text-[14px] font-medium">
                          {money(item.unitPrice * item.qty)}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        <QtyStepper value={item.qty} onChange={(n) => setQty(item.key, n)} />
                        <button
                          type="button"
                          onClick={() => toggleWishlist(item.slug)}
                          className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase hover:text-gold"
                        >
                          Save for later
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase hover:text-gold"
                        >
                          {copy.remove}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <Link to="/shop" className={`${btnOutline} mt-6`}>
                {copy.emptyCta}
              </Link>
            </div>

            <aside className="h-fit border border-border bg-cream p-6 lg:sticky lg:top-28">
              <h2 className="section-title">Summary</h2>
              <dl className="mt-5 space-y-3 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{copy.subtotal}</dt>
                  <dd>{money(totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{copy.shipping}</dt>
                  <dd>{totals.shipping === 0 ? copy.shippingFree : money(totals.shipping)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{copy.tax}</dt>
                  <dd>{money(totals.tax)}</dd>
                </div>
                <div className="flex justify-between border-t border-clay pt-3 text-[15px] font-medium">
                  <dt>{copy.total}</dt>
                  <dd>{money(totals.total)}</dd>
                </div>
              </dl>
              <Link to="/checkout" className={`${btnPrimary} mt-6 w-full`}>
                {copy.checkout}
              </Link>
              <p className="mt-3 text-[11px] text-muted-foreground">{copy.note}</p>
            </aside>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
