import { useState } from "react";
import { site } from "@/content/site";
import { ArrowRightIcon } from "@/components/icons";

export function Newsletter() {
  const n = site.newsletter;
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="mt-14 bg-cream md:mt-16">
      <div className="mx-auto max-w-[1200px] px-6 py-14 text-center md:py-16">
        <h2 className="text-[26px] md:text-[34px]">{n.title}</h2>
        <p className="mx-auto mt-3 max-w-[46ch] text-[13.5px] leading-[1.75] text-muted-foreground">
          {n.body}
        </p>
        <form
          className="mx-auto mt-7 flex max-w-[480px] flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
          }}
        >
          <label className="sr-only" htmlFor="newsletter-email">
            {n.placeholder}
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={n.placeholder}
            className="flex-1 border border-clay bg-background px-4 py-3 text-[13px] placeholder:text-muted-foreground focus-visible:border-gold focus-visible:outline-none"
          />
          <button
            type="submit"
            className="group inline-flex items-center justify-center gap-2 bg-ink px-6 py-3 text-[11px] tracking-[0.18em] text-primary-foreground uppercase transition-colors hover:bg-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {n.cta}
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-1" />
          </button>
        </form>
        <p aria-live="polite" className="mt-3 text-[11.5px] text-muted-foreground">
          {done ? `${email} — ${n.note}` : n.note}
        </p>
      </div>
    </section>
  );
}
