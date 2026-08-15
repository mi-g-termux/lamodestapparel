import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { site, productCards } from "@/content/site";
import { useMoney } from "@/lib/locale";
import { SiteShell, PageHeading, pageMeta } from "@/components/SiteShell";
import { ProductCard } from "@/components/ProductCard";
import { Newsletter } from "@/components/Newsletter";

export const Route = createFileRoute("/shop")({
  head: () =>
    pageMeta(
      "Shop All",
      "Browse the full Velora collection — dresses, shirts, co-ords and accessories in warm neutral tones, with free shipping over $75.",
    ),
  component: ShopPage,
});

const sorts = ["Newest", "Price: Low to High", "Price: High to Low", "Top Rated"] as const;

function ShopPage() {
  const money = useMoney();
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<(typeof sorts)[number]>("Newest");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(site.catalog.map((p) => p.category)))],
    [],
  );

  const products = useMemo(() => {
    const list = site.catalog.filter((p) => category === "All" || p.category === category);
    const sorted = [...list].sort((a, b) => {
      if (sort === "Price: Low to High") return a.price - b.price;
      if (sort === "Price: High to Low") return b.price - a.price;
      if (sort === "Top Rated") return b.rating - a.rating || b.reviews - a.reviews;
      return 0;
    });
    const cards = productCards();
    return sorted.map((p) => cards.find((c) => c.slug === p.slug)!);
  }, [category, sort]);

  return (
    <SiteShell>
      <PageHeading
        eyebrow={site.slides[0]?.eyebrow ?? ""}
        title="Shop All"
        body="Every piece cut from natural fibres in a warm neutral palette, made to layer season after season."
        crumbs={[{ label: "Shop" }]}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
          <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 px-4 py-2 text-[11px] tracking-[0.16em] uppercase transition-colors ${
                  category === c
                    ? "bg-ink text-primary-foreground"
                    : "border border-border hover:border-gold hover:text-gold"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as (typeof sorts)[number])}
              className="border border-border bg-background px-3 py-2 text-[12px] tracking-normal text-foreground normal-case focus:border-gold focus:outline-none"
            >
              {sorts.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-5 text-[12px] text-muted-foreground">
          {products.length} pieces · from {money(Math.min(...site.catalog.map((p) => p.price)))}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-5">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>

      <Newsletter />
    </SiteShell>
  );
}
