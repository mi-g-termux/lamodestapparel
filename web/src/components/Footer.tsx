import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { site } from "@/content/site";
import { PlusIcon, MinusIcon } from "@/components/icons";
import payPaypal from "@/assets/pay-paypal.png";
import payStripe from "@/assets/pay-stripe.png";

export function Footer() {
  const [openCol, setOpenCol] = useState<string | null>(null);

  return (
    <footer className="border-t border-clay/60 bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-12 md:py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-8">
          <div>
            <span className="block font-display text-[24px] tracking-[0.3em]">
              {site.brand.name}
            </span>
            <span className="mt-1.5 block text-[8px] tracking-[0.4em] text-muted-foreground uppercase">
              {site.brand.tagline}
            </span>
            <p className="mt-5 max-w-[36ch] text-[12.5px] leading-[1.8] text-muted-foreground">
              {site.footerAbout.body}
            </p>
            <p className="mt-5 flex flex-wrap items-center gap-4">
              {site.footerAbout.socials.map((s) => (
                <Link key={s.label} to={s.href} className="link-quiet">
                  {s.label}
                </Link>
              ))}
            </p>
          </div>

          {site.footerColumns.map((col) => {
            const open = openCol === col.title;
            return (
              <div key={col.title} className="border-b border-border pb-3 md:border-0 md:pb-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenCol(open ? null : col.title)}
                  className="flex w-full items-center justify-between py-2 text-left md:pointer-events-none md:py-0"
                >
                  <span className="text-[11px] tracking-[0.16em] uppercase">{col.title}</span>
                  <span className="md:hidden">
                    {open ? <MinusIcon className="size-4" /> : <PlusIcon className="size-4" />}
                  </span>
                </button>
                <ul className={`${open ? "block" : "hidden"} space-y-2.5 pt-2 md:block md:pt-4`}>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.href} className="link-quiet">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-[11.5px] text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>{site.legal.copyright}</p>
          <div className="flex items-center gap-3">
            <img src={payStripe} alt="Stripe" loading="lazy" className="h-4 w-auto object-contain" />
            <img src={payPaypal} alt="PayPal" loading="lazy" className="h-4 w-auto object-contain" />
            <span>{site.legal.payments}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
