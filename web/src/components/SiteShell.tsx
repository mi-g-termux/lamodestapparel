import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { site } from "@/content/site";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[11px] tracking-[0.08em] text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link to="/" className="hover:text-gold">
            Home
          </Link>
        </li>
        {items.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5">
            <span aria-hidden>/</span>
            {c.href ? (
              <Link to={c.href} className="hover:text-gold">
                {c.label}
              </Link>
            ) : (
              <span className="text-foreground">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeading({
  eyebrow,
  title,
  body,
  crumbs,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  crumbs?: Crumb[];
}) {
  return (
    <div className="border-b border-border bg-cream">
      <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        {crumbs ? <Breadcrumbs items={crumbs} /> : null}
        {eyebrow ? <p className="eyebrow mt-5 text-gold">{eyebrow}</p> : null}
        <h1 className="mt-2 font-display text-[30px] leading-[1.15] md:text-[42px]">{title}</h1>
        {body ? (
          <p className="mt-3 max-w-[62ch] text-[14px] text-muted-foreground">{body}</p>
        ) : null}
      </div>
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

/** Reusable page-level meta helper so every route ships unique metadata. */
export const pageMeta = (title: string, description: string) => ({
  meta: [
    { title: `${title} — ${site.brand.name}` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — ${site.brand.name}` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});
