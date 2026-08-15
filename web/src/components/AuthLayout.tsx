import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { site } from "@/content/site";
import { ShieldIcon } from "@/components/icons";

/**
 * Imageless auth frame: one quiet, centred card on a cream field, shared by
 * sign in, register, forgot password and reset password so the account flow
 * stays consistent and typographic.
 */
export function AuthLayout({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Link
          to="/"
          className="inline-block leading-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="font-display text-[19px] tracking-[0.3em] sm:text-[21px]">
            {site.brand.name}
          </span>
        </Link>
        <Link
          to="/"
          className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase hover:text-gold"
        >
          Back to store
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-14 sm:px-6">
        <div className="w-full max-w-[440px]">
          <div className="border border-border bg-background px-5 py-8 sm:px-9 sm:py-10">
            <h1 className="font-display text-[24px] leading-[1.15] sm:text-[28px]">{title}</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{intro}</p>
            <div className="mt-7 sm:mt-8">{children}</div>
          </div>

          {footer ? (
            <div className="mt-5 text-center text-[13px] text-muted-foreground">{footer}</div>
          ) : null}

          <p className="mt-5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <ShieldIcon className="size-3.5 text-gold" aria-hidden />
            Secured with 256-bit encryption
          </p>
        </div>
      </main>
    </div>
  );
}
