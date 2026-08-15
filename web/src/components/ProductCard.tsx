import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getProduct, type Product } from "@/content/site";
import { useStore } from "@/lib/store";
import { useMoney } from "@/lib/locale";
import { Stars } from "@/components/Stars";
import { HeartIcon, BagIcon } from "@/components/icons";

export function ProductCard({ product, className = "" }: { product: Product; className?: string }) {
  const { addToCart, toggleWishlist, isWishlisted, openCart } = useStore();
  const money = useMoney();
  const saved = isWishlisted(product.slug);
  const full = getProduct(product.slug);

  const quickAdd = () => {
    if (!full) return;
    addToCart({
      slug: full.slug,
      size: full.sizes[0] ?? "One size",
      color: full.colors[0]?.name ?? "Default",
    });
    // Quiet confirmation instead of taking over the screen with the drawer.
    toast.success(`${full.name} added to your bag`, {
      description: `${full.colors[0]?.name ?? "Default"} · ${full.sizes[0] ?? "One size"}`,
      action: { label: "View bag", onClick: openCart },
    });
  };

  return (
    <article className={`group relative flex flex-col ${className}`}>
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="block overflow-hidden bg-cream focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={700}
          height={900}
          className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </Link>

      {product.badge ? (
        <span className="absolute top-2.5 left-2.5 bg-background px-2 py-1 text-[9px] tracking-[0.14em] uppercase">
          {product.badge}
        </span>
      ) : null}

      <button
        type="button"
        onClick={() => toggleWishlist(product.slug)}
        aria-pressed={saved}
        aria-label={`${saved ? "Remove" : "Add"} ${product.name} ${saved ? "from" : "to"} wishlist`}
        className={`absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-background/85 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
          saved ? "text-gold" : "text-foreground hover:text-gold"
        }`}
      >
        <HeartIcon className="size-4" fill={saved ? "currentColor" : "none"} />
      </button>

      <div className="flex flex-1 flex-col pt-3">
        <h3 className="font-sans text-[13px] font-normal tracking-[0.01em]">
          <Link to="/product/$slug" params={{ slug: product.slug }} className="hover:text-gold">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-[13.5px] font-medium">{money(product.price)}</p>
        <p className="mt-1.5 flex items-center gap-1.5">
          <Stars value={product.rating} />
          <span className="text-[11px] text-muted-foreground">({product.reviews})</span>
        </p>

        <button
          type="button"
          onClick={quickAdd}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 border border-ink px-4 py-2.5 text-[10.5px] tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <BagIcon className="size-3.5" aria-hidden />
          Add to bag
        </button>
      </div>
    </article>
  );
}
