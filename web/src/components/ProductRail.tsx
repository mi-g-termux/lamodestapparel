import { useRef } from "react";
import { site } from "@/content/site";
import { SectionHead } from "@/components/SectionHead";
import { ProductCard } from "@/components/ProductCard";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

export function ProductRail() {
  const { title, viewAll, viewAllHref } = site.arrivalsSection;
  const track = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-12 md:pt-14">
      <SectionHead title={title} viewAll={viewAll} viewAllHref={viewAllHref} />

      <div className="relative mt-5 md:mt-6">
        <div
          ref={track}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto md:grid md:grid-cols-5 md:gap-4 md:overflow-visible"
        >
          {site.products.map((p) => (
            <ProductCard
              key={p.slug}
              product={p}
              className="w-[46vw] shrink-0 snap-start sm:w-[240px] md:w-auto"
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Previous products"
          onClick={() => scrollBy(-1)}
          className="absolute top-[38%] -left-3 hidden size-9 place-items-center rounded-full bg-background shadow-card transition-colors hover:text-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Next products"
          onClick={() => scrollBy(1)}
          className="absolute top-[38%] -right-3 hidden size-9 place-items-center rounded-full bg-background shadow-card transition-colors hover:text-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    </section>
  );
}
