import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { CartDrawer } from "@/components/CartDrawer";
import { WishlistPreview } from "@/components/WishlistPreview";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { SearchIcon, UserIcon, BagIcon, MenuIcon, CloseIcon } from "@/components/icons";

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to={site.brand.href} className="block leading-none">
      <span
        className={
          compact
            ? "font-display text-[18px] tracking-[0.24em]"
            : "font-display text-[26px] tracking-[0.3em]"
        }
      >
        {site.brand.name}
      </span>
      <span
        className={
          compact
            ? "mt-1 block text-[7px] tracking-[0.3em] text-muted-foreground uppercase"
            : "mt-1.5 block text-[8px] tracking-[0.4em] text-muted-foreground uppercase"
        }
      >
        {site.brand.tagline}
      </span>
    </Link>
  );
}

const iconButtonClass =
  "relative grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-cream focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function IconButton({
  label,
  count,
  to,
  onClick,
  children,
}: {
  label: string;
  count?: number | undefined;
  to?: string | undefined;
  onClick?: (() => void) | undefined;
  children: React.ReactNode;
}) {
  const badge = count ? (
    <span className="absolute top-0 right-0 grid size-4 place-items-center rounded-full bg-ink text-[9px] font-medium text-primary-foreground">
      {count}
    </span>
  ) : null;

  if (to) {
    return (
      <Link to={to} aria-label={label} className={iconButtonClass}>
        {children}
        {badge}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={iconButtonClass}>
      {children}
      {badge}
    </button>
  );
}

const mobileLinkClass = "border-b border-border py-3.5 text-sm tracking-[0.08em] uppercase";

export function Header() {
  const [open, setOpen] = useState(false);
  const { cartCount, openCart } = useStore();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      {/* desktop */}
      <div className="mx-auto hidden max-w-[1200px] items-center justify-between gap-6 px-6 py-5 md:flex">
        <Wordmark />
        <nav aria-label="Main" className="flex min-w-0 items-center gap-5 lg:gap-7">
          {site.nav.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="shrink-0 text-[13px] tracking-[0.04em] text-foreground transition-colors hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <CurrencySwitcher />
          <IconButton label="Search" to="/shop">
            <SearchIcon className="size-[18px]" aria-hidden />
          </IconButton>
          <IconButton label="Account and orders" to="/account">
            <UserIcon className="size-[18px]" aria-hidden />
          </IconButton>
          <WishlistPreview />
          <IconButton label="Open bag" onClick={openCart} count={cartCount}>
            <BagIcon className="size-[18px]" aria-hidden />
          </IconButton>
        </div>
      </div>

      {/* mobile */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="grid size-9 shrink-0 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <MenuIcon className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 text-center">
          <Wordmark compact />
        </div>
        <div className="flex shrink-0 items-center">
          <WishlistPreview compact />
          <IconButton label="Open bag" onClick={openCart} count={cartCount}>
            <BagIcon className="size-[17px]" aria-hidden />
          </IconButton>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            role="presentation"
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div className="relative flex h-dvh w-[86%] max-w-[320px] flex-col overflow-y-auto bg-background p-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <Wordmark compact />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <CloseIcon className="size-5" aria-hidden />
              </button>
            </div>
            <nav aria-label="Mobile" className="mt-8 flex flex-col">
              {site.nav.map((item) => (
                <Link key={item.label} to={item.href} onClick={() => setOpen(false)} className={mobileLinkClass}>
                  {item.label}
                </Link>
              ))}
              <Link to="/orders" onClick={() => setOpen(false)} className={mobileLinkClass}>
                Order History
              </Link>
              <Link to="/wishlist" onClick={() => setOpen(false)} className={mobileLinkClass}>
                Wishlist
              </Link>
              <Link to="/track-order" onClick={() => setOpen(false)} className={mobileLinkClass}>
                Track Order
              </Link>
              <Link to="/account" onClick={() => setOpen(false)} className={mobileLinkClass}>
                My Account
              </Link>
            </nav>
            <div className="mt-8">
              <p className="mb-3 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                Region & currency
              </p>
              <CurrencySwitcher variant="block" />
            </div>
          </div>
        </div>
      ) : null}

      <CartDrawer />
    </header>
  );
}
