import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { site } from "@/content/site";
import { useMoney } from "@/lib/locale";
import { SiteShell, PageHeading, pageMeta } from "@/components/SiteShell";
import { btnPrimary, btnOutline, Panel } from "@/components/kit";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/account")({
  head: () => pageMeta("My Account", "Your Velora account — orders, saved pieces and delivery details."),
  component: AccountPage,
});

function AccountPage() {
  const money = useMoney();
  const { account, signOut, orders, wishlist, reorder, openCart } = useStore();
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
        title={account ? `Hello, ${account.name}` : "My Account"}
        body={account ? account.email : "Sign in to see your orders, saved pieces and addresses."}
        crumbs={[{ label: "Account" }]}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        {!account ? (
          <Panel className="mx-auto max-w-[520px] text-center">
            <h2 className="font-display text-[24px]">You're signed out</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Sign in to keep your bag, wishlist and order history in one place.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/login" className={btnPrimary}>
                Sign in
              </Link>
              <Link to="/register" className={btnOutline}>
                Create account
              </Link>
            </div>
          </Panel>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
            <aside className="h-fit border border-border bg-cream p-6">
              <p className="text-[13px]">{account.name}</p>
              <p className="text-[12px] text-muted-foreground">{account.email}</p>
              <nav className="mt-5 flex flex-col gap-2.5 text-[13px]">
                <Link to="/wishlist" className="hover:text-gold">
                  Wishlist ({wishlist.length})
                </Link>
                <Link to="/cart" className="hover:text-gold">
                  Shopping bag
                </Link>
                <Link to="/track-order" className="hover:text-gold">
                  Track an order
                </Link>
                <Link to="/shipping-returns" className="hover:text-gold">
                  Returns
                </Link>
              </nav>
              <button type="button" onClick={signOut} className={`${btnOutline} mt-6 w-full`}>
                Sign out
              </button>
            </aside>

            <section>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                <h2 className="section-title">Order history</h2>
                <Link to="/orders" className="shrink-0 text-[12px] underline hover:text-gold">
                  View all
                </Link>
              </div>
              {orders.length === 0 ? (
                <p className="mt-4 border border-border px-5 py-10 text-center text-[13px] text-muted-foreground">
                  No orders yet.{" "}
                  <Link to="/shop" className="underline hover:text-gold">
                    Start shopping
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {orders.map((o) => (
                    <li key={o.id} className="border border-border p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[14px]">{o.id}</p>
                          <p className="text-[12px] text-muted-foreground">
                            {new Date(o.createdAt).toLocaleDateString("en-GB")} · {o.items.length} items ·{" "}
                            {o.status}
                          </p>
                        </div>
                        <p className="text-[14px] font-medium">{money(o.totals.total)}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleReorder(o.id)} className={btnOutline}>
                          Reorder
                        </button>
                        <Link to="/order/$id" params={{ id: o.id }} className={btnOutline}>
                          Invoice
                        </Link>
                        <Link to="/track-order" className={btnOutline}>
                          Track
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-8 text-[11px] text-muted-foreground">
                Account data is stored on this device for the demo theme. Connect {site.brand.name} to a
                backend to persist it across devices.
              </p>
            </section>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
