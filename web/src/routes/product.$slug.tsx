import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getProduct, relatedProducts, site, formatPrice, galleryForColor } from "@/content/site";
import { useMoney } from "@/lib/locale";
import { SiteShell, Breadcrumbs, pageMeta } from "@/components/SiteShell";
import { ProductCard } from "@/components/ProductCard";
import { Accordion, QtyStepper, btnPrimary, btnOutline } from "@/components/kit";
import { Stars } from "@/components/Stars";
import { HeartIcon, TruckIcon, RefreshIcon, ShieldIcon } from "@/components/icons";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Product unavailable" }, { name: "robots", content: "noindex" }],
      };
    }
    const p = loaderData.product;
    return pageMeta(p.name, `${p.description} ${formatPrice(p.price)} at Velora.`);
  },
  component: ProductPage,
});

function ProductPage() {
  const money = useMoney();
  const { slug } = Route.useParams();
  const product = getProduct(slug)!;
  const copy = site.productPage;
  const { addToCart, toggleWishlist, isWishlisted } = useStore();

  const [active, setActive] = useState(0);
  const [color, setColor] = useState(product.colors[0]?.name ?? "Default");
  const [size, setSize] = useState(product.sizes[Math.min(2, product.sizes.length - 1)] ?? "One size");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const saved = isWishlisted(product.slug);
  // Gallery follows the selected colour variant.
  const gallery = galleryForColor(product, color);

  const selectColor = (name: string) => {
    setColor(name);
    setActive(0);
  };

  const add = () => {
    addToCart({ slug: product.slug, size, color, qty });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2600);
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1200px] px-6 pt-6">
        <Breadcrumbs
          items={[
            { label: copy.breadcrumbRoot, href: "/shop" },
            { label: product.category, href: "/shop" },
            { label: product.name },
          ]}
        />
      </div>

      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 pt-6 pb-14 md:grid-cols-[minmax(0,1fr)_400px] md:gap-14 md:pt-8">
        {/* gallery */}
        <div>
          <div className="relative flex gap-4">
            <div className="hidden flex-col items-center gap-2.5 pt-2 md:flex">
              {gallery.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  aria-label={`View image ${i + 1}`}
                  aria-current={active === i}
                  onClick={() => setActive(i)}
                  className={`size-[7px] rounded-full transition-colors ${
                    active === i ? "bg-ink" : "border border-clay bg-transparent"
                  }`}
                />
              ))}
            </div>

            <div className="min-w-0 flex-1 bg-cream">
              <img
                src={gallery[active]}
                alt={`${product.name} — view ${active + 1}`}
                width={1000}
                height={1250}
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          </div>

          <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto">
            {gallery.map((src, i) => (
              <button
                key={`t-${src}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                className={`w-[86px] shrink-0 overflow-hidden border transition-colors ${
                  active === i ? "border-ink" : "border-transparent hover:border-clay"
                }`}
              >
                <img
                  src={src}
                  alt={`${product.name} thumbnail ${i + 1}`}
                  width={200}
                  height={250}
                  className="aspect-[4/5] w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* details */}
        <div className="md:pt-2">
          <p className="eyebrow text-gold">{product.collection}</p>
          <h1 className="mt-2.5 font-display text-[30px] leading-[1.15] md:text-[34px]">
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-3">
            <p className="text-[19px] font-medium">{money(product.price)}</p>
            {product.compareAt ? (
              <p className="text-[13px] text-muted-foreground line-through">
                {money(product.compareAt)}
              </p>
            ) : null}
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <Stars value={product.rating} size={13} />
            <span className="text-[12px] text-muted-foreground">
              {product.rating} · {product.reviews} reviews
            </span>
          </div>

          <p className="mt-5 max-w-[46ch] text-[13.5px] leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          {/* colour */}
          <div className="mt-7">
            <p className="text-[12px]">
              <span className="font-medium">Product Color:</span>{" "}
              <span className="text-muted-foreground">{color}</span>
            </p>
            <p className="mt-3 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              {copy.colorLabel}
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              {product.colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  aria-label={c.name}
                  aria-pressed={color === c.name}
                  onClick={() => selectColor(c.name)}
                  className={`grid size-8 place-items-center rounded-full border transition-colors ${
                    color === c.name ? "border-ink" : "border-transparent hover:border-clay"
                  }`}
                >
                  <span
                    className="size-[22px] rounded-full border border-clay/60"
                    style={{ backgroundColor: c.hex }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* size */}
          <div className="mt-7">
            <div className="flex items-baseline justify-between">
              <p className="text-[12px] font-medium">
                {copy.sizeLabel}: <span className="font-normal text-muted-foreground">{size}</span>
              </p>
              <Link to={copy.sizeChartHref} className="text-[12px] underline hover:text-gold">
                {copy.sizeChart}
              </Link>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={size === s}
                  onClick={() => setSize(s)}
                  className={`min-w-11 border px-3 py-2 text-[12px] transition-colors ${
                    size === s ? "border-ink bg-ink text-primary-foreground" : "border-border hover:border-ink"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* quantity + actions */}
          <div className="mt-7 flex items-center gap-4">
            <QtyStepper value={qty} onChange={setQty} label={copy.quantityLabel} />
            <span className="text-[12px] text-muted-foreground">
              {money(product.price * qty)} total
            </span>
          </div>

          <button type="button" onClick={add} className={`${btnPrimary} mt-5 w-full`}>
            {copy.addToBag}
          </button>

          <button
            type="button"
            onClick={() => toggleWishlist(product.slug)}
            className={`${btnOutline} mt-2.5 w-full`}
          >
            <HeartIcon className="size-4" fill={saved ? "currentColor" : "none"} />
            {saved ? copy.inWishlist : copy.addToWishlist}
          </button>

          <div aria-live="polite" className="min-h-6">
            {added ? (
              <p className="mt-3 flex items-center justify-between gap-3 border border-clay bg-cream px-4 py-2.5 text-[12px]">
                {copy.added}
                <Link to="/cart" className="underline hover:text-gold">
                  View bag
                </Link>
              </p>
            ) : null}
          </div>

          <ul className="mt-6 space-y-2.5 text-[12px] text-muted-foreground">
            <li className="flex items-center gap-2.5">
              <TruckIcon className="size-4 text-gold" /> Free shipping over $75
            </li>
            <li className="flex items-center gap-2.5">
              <RefreshIcon className="size-4 text-gold" /> 14-day free returns
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldIcon className="size-4 text-gold" /> Secure checkout
            </li>
          </ul>

          <div className="mt-8">
            <Accordion items={product.details} defaultOpen={0} />
          </div>
        </div>
      </div>

      <section className="border-t border-border bg-cream">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:py-16">
          <h2 className="section-title">{copy.relatedTitle}</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {relatedProducts(product.slug).map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
