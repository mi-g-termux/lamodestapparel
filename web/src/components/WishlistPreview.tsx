import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getProduct } from "@/content/site";
import { useStore } from "@/lib/store";
import { useMoney } from "@/lib/locale";
import { btnPrimary, btnOutline } from "@/components/kit";
import { CloseIcon, HeartIcon } from "@/components/icons";

/**
 * Header wishlist preview: see saved pieces and move them straight into the bag
 * without leaving the page.
 */
export function WishlistPreview({ compact = false }: { compact?: boolean }) {
  const { wishlist, moveToCart, toggleWishlist } = useStore();
  const money = useMoney();
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

  const items = wishlist.map(getProduct).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Wishlist preview, ${items.length} saved ${items.length === 1 ? "item" : "items"}`}
        className="relative grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-cream focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <HeartIcon className={compact ? "size-[17px]" : "size-[18px]"} aria-hidden />
        {items.length ? (
          <span className="absolute top-0 right-0 grid size-4 place-items-center rounded-full bg-ink text-[9px] font-medium text-primary-foreground">
            {items.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Wishlist preview"
          className="absolute right-0 z-50 mt-2 w-[min(92vw,340px)] border border-border bg-background shadow-xl"
        >
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3">
            <p className="truncate text-[11px] tracking-[0.14em] uppercase">
              Wishlist ({items.length})
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close wishlist preview"
              className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-cream"
            >
              <CloseIcon className="size-4" aria-hidden />
            </button>
          </header>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px]">Nothing saved yet.</p>
              <Link
                to="/shop"
                onClick={() => setOpen(false)}
                className="mt-2 inline-block text-[12px] underline hover:text-gold"
              >
                Browse new arrivals
              </Link>
            </div>
          ) : (
            <>
              <ul className="max-h-[320px] divide-y divide-border overflow-y-auto px-4">
                {items.map((p) => (
                  <li key={p.slug} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 py-3">
                    <Link to="/product/$slug" params={{ slug: p.slug }} onClick={() => setOpen(false)}>
                      <img
                        src={p.image}
                        alt={p.name}
                        width={52}
                        height={66}
                        className="aspect-[3/4] w-[52px] object-cover"
                      />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        to="/product/$slug"
                        params={{ slug: p.slug }}
                        onClick={() => setOpen(false)}
                        className="block truncate text-[13px] hover:text-gold"
                      >
                        {p.name}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{money(p.price)}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            moveToCart(p.slug);
                            toast.success(`${p.name} moved to your bag`);
                          }}
                          className="text-[11px] tracking-[0.1em] uppercase underline hover:text-gold"
                        >
                          Move to bag
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleWishlist(p.slug)}
                          aria-label={`Remove ${p.name} from wishlist`}
                          className="text-[11px] text-muted-foreground underline hover:text-gold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="grid gap-2 border-t border-border p-4">
                <button
                  type="button"
                  onClick={() => {
                    const names = items.length;
                    items.forEach((p) => moveToCart(p.slug));
                    toast.success(`${names} ${names === 1 ? "piece" : "pieces"} moved to your bag`);
                    setOpen(false);
                  }}
                  className={`${btnPrimary} w-full`}
                >
                  Move all to bag
                </button>
                <Link to="/wishlist" onClick={() => setOpen(false)} className={`${btnOutline} w-full`}>
                  View wishlist
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
