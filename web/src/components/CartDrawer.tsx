import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useMoney } from "@/lib/locale";
import { btnPrimary, btnOutline } from "@/components/kit";
import { CloseIcon, PlusIcon, MinusIcon, BagIcon } from "@/components/icons";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Slide-in bag drawer. Accessible dialog: focus is moved in on open, trapped
 * while open, ESC closes, and focus returns to whatever opened it.
 * It only opens when the shopper asks for it (bag icon / "view bag") — adding an
 * item never hijacks the screen.
 */
export function CartDrawer() {
  const { cartOpen, closeCart, cart, totals, setQty, removeItem } = useStore();
  const money = useMoney();
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!cartOpen) return;
    restoreRef.current = document.activeElement;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeCart();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = "";
      (restoreRef.current as HTMLElement | null)?.focus?.();
    };
  }, [cartOpen, closeCart]);

  if (!cartOpen) return null;

  const lines = cart.reduce((n, i) => n + i.qty, 0);

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        role="presentation"
        onClick={closeCart}
        className="absolute inset-0 bg-ink/40"
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        aria-describedby="cart-drawer-summary"
        className="absolute inset-y-0 right-0 flex h-dvh w-[92%] max-w-[420px] flex-col bg-background shadow-xl"
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-5 py-4">
          <h2
            id="cart-drawer-title"
            className="flex min-w-0 items-center gap-2 text-[12px] tracking-[0.16em] uppercase"
          >
            <BagIcon className="size-4 shrink-0 text-gold" aria-hidden />
            <span className="truncate">Your bag ({lines})</span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeCart}
            aria-label="Close bag"
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-cream focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <CloseIcon className="size-5" aria-hidden />
          </button>
        </header>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            <p className="font-display text-[22px]">Your bag is empty</p>
            <p id="cart-drawer-summary" className="text-[13px] text-muted-foreground">
              Add a piece and it will appear here.
            </p>
            <Link to="/shop" onClick={closeCart} className={btnPrimary}>
              Shop new in
            </Link>
          </div>
        ) : (
          <>
            <ul aria-label="Bag items" className="flex-1 divide-y divide-border overflow-y-auto px-5">
              {cart.map((i) => (
                <li key={i.key} className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 py-4">
                  <img
                    src={i.image}
                    alt={i.name}
                    width={64}
                    height={84}
                    className="aspect-[3/4] w-16 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px]">{i.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {i.color} · {i.size}
                    </p>
                    <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                      <span
                        className="inline-flex shrink-0 items-center border border-border"
                        role="group"
                        aria-label={`Quantity for ${i.name}`}
                      >
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${i.name}`}
                          onClick={() => setQty(i.key, i.qty - 1)}
                          className="grid size-8 place-items-center hover:text-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <MinusIcon className="size-3" aria-hidden />
                        </button>
                        <span className="w-7 text-center text-[12px]" aria-live="polite">
                          {i.qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${i.name}`}
                          onClick={() => setQty(i.key, i.qty + 1)}
                          className="grid size-8 place-items-center hover:text-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <PlusIcon className="size-3" aria-hidden />
                        </button>
                      </span>
                      <span className="text-right text-[13px]">{money(i.unitPrice * i.qty)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i.key)}
                      aria-label={`Remove ${i.name} from bag`}
                      className="mt-2 text-[11px] text-muted-foreground underline hover:text-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-border px-5 py-5">
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{money(totals.subtotal)}</span>
              </div>
              <p id="cart-drawer-summary" className="mt-1 text-[11px] text-muted-foreground">
                Shipping and tax calculated at checkout.
              </p>
              <div className="mt-4 grid gap-2">
                <Link to="/checkout" onClick={closeCart} className={`${btnPrimary} w-full`}>
                  Checkout
                </Link>
                <Link to="/cart" onClick={closeCart} className={`${btnOutline} w-full`}>
                  View full bag
                </Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
