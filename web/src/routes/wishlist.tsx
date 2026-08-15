import { createFileRoute, Link } from "@tanstack/react-router";
import { getProduct, site } from "@/content/site";
import { useMoney } from "@/lib/locale";
import { SiteShell, PageHeading, pageMeta } from "@/components/SiteShell";
import { btnPrimary, btnOutline } from "@/components/kit";
import { Stars } from "@/components/Stars";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/wishlist")({
  head: () =>
    pageMeta("Wishlist", "The Velora pieces you saved — move them into your bag whenever you're ready."),
  component: WishlistPage,
});

function WishlistPage() {
  const money = useMoney();
  const copy = site.wishlistPage;
  const { wishlist, moveToCart, toggleWishlist } = useStore();
  const items = wishlist.map(getProduct).filter(Boolean);

  return (
    <SiteShell>
      <PageHeading
        title={copy.title}
        body="Saved pieces stay here on this device until you move them into your bag."
        crumbs={[{ label: copy.title }]}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        {items.length === 0 ? (
          <div className="border border-border py-20 text-center">
            <p className="font-display text-[24px]">{copy.empty}</p>
            <Link to="/shop" className={`${btnPrimary} mt-6`}>
              {copy.emptyCta}
            </Link>
          </div>
        ) : (
          <ul className="grid gap-x-4 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <li key={p!.slug} className="group border border-border">
                <Link to="/product/$slug" params={{ slug: p!.slug }} className="block bg-cream">
                  <img
                    src={p!.image}
                    alt={p!.name}
                    width={700}
                    height={875}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </Link>
                <div className="p-5">
                  <h2 className="font-sans text-[14px]">
                    <Link to="/product/$slug" params={{ slug: p!.slug }} className="hover:text-gold">
                      {p!.name}
                    </Link>
                  </h2>
                  <p className="mt-1 text-[14px] font-medium">{money(p!.price)}</p>
                  <p className="mt-1.5 flex items-center gap-2">
                    <Stars value={p!.rating} />
                    <span className="text-[11px] text-muted-foreground">({p!.reviews})</span>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => moveToCart(p!.slug)} className={btnPrimary}>
                      {copy.move}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWishlist(p!.slug)}
                      className={btnOutline}
                    >
                      {copy.remove}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}
