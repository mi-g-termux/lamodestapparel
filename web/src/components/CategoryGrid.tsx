import { Link } from "@tanstack/react-router";
import { site } from "@/content/site";
import { SectionHead } from "@/components/SectionHead";
import { ArrowRightIcon } from "@/components/icons";

export function CategoryGrid() {
  const { title, viewAll, viewAllHref } = site.categorySection;

  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-12 md:pt-14">
      <SectionHead title={title} viewAll={viewAll} viewAllHref={viewAllHref} />

      <div className="mt-5 grid grid-cols-2 gap-3 md:mt-6 md:grid-cols-4 md:gap-4">
        {site.categories.map((c) => (
          <Link
            key={c.name}
            to={c.href}
            className="group relative block overflow-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <img
              src={c.image}
              alt={c.name}
              loading="lazy"
              width={700}
              height={900}
              className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] md:aspect-[4/5]"
            />
            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/70 to-transparent" />
            <span className="absolute bottom-3 left-3 md:bottom-4 md:left-4">
              <span className="block font-display text-[19px] text-primary-foreground md:text-[22px]">
                {c.name}
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-[11px] tracking-[0.08em] text-primary-foreground/85">
                {c.cta}
                <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-1" />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
