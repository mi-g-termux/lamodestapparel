import { Link } from "@tanstack/react-router";
import { site } from "@/content/site";
import { ArrowRightIcon } from "@/components/icons";

export function PromoBanner() {
  const promo = site.promo;

  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-12 md:pt-14">
      <div className="relative overflow-hidden bg-sand">
        <img
          src={promo.image}
          alt={promo.imageAlt}
          loading="lazy"
          width={1600}
          height={560}
          className="absolute inset-0 size-full object-cover object-[70%_center]"
        />
        <span className="absolute inset-0 bg-gradient-to-r from-sand via-sand/85 to-transparent" />
        <div className="relative px-6 py-12 md:px-14 md:py-20">
          <p className="eyebrow text-gold">{promo.eyebrow}</p>
          <h2 className="mt-3 text-[30px] leading-[1.12] md:text-[44px]">
            {promo.titleTop}
            <br />
            {promo.titleBottom}
          </h2>
          <Link
            to={promo.href}
            className="group mt-6 inline-flex items-center gap-2.5 bg-ink px-6 py-3 text-[11px] tracking-[0.18em] text-primary-foreground uppercase transition-colors hover:bg-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {promo.cta}
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
