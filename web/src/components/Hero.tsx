import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { site } from "@/content/site";
import { ArrowRightIcon } from "@/components/icons";

export function Hero() {
  const [index, setIndex] = useState(0);
  const slides = site.slides;

  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const slide = slides[index]!;

  return (
    <section className="mx-auto max-w-[1200px] px-0 md:px-6">
      <div className="relative overflow-hidden bg-cream">
        <div className="grid md:grid-cols-2">
          <div className="order-2 flex flex-col justify-center px-6 pt-8 pb-10 md:order-1 md:px-12 md:py-24">
            <p key={`e-${index}`} className="eyebrow rise-in text-gold">
              {slide.eyebrow}
            </p>
            <h1
              key={`t-${index}`}
              className="rise-in mt-4 text-[38px] leading-[1.04] md:text-[62px]"
            >
              {slide.titleTop}
              <br />
              <span className="text-gold">{slide.titleBottom}</span>
            </h1>
            <p
              key={`b-${index}`}
              className="rise-in mt-5 max-w-[34ch] text-[13.5px] leading-[1.75] text-muted-foreground md:text-[15px]"
            >
              {slide.body}
            </p>
            <div className="mt-7">
              <Link
                to={slide.href}
                className="group inline-flex items-center gap-2.5 bg-ink px-7 py-3.5 text-[11px] tracking-[0.18em] text-primary-foreground uppercase transition-colors hover:bg-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {slide.cta}
                <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.titleTop}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                  className={
                    i === index
                      ? "h-[3px] w-7 bg-ink transition-all"
                      : "h-[3px] w-2 bg-clay transition-all hover:bg-gold"
                  }
                />
              ))}
            </div>
          </div>

          <div className="order-1 md:order-2">
            <img
              key={`i-${index}`}
              src={slide.image}
              alt={slide.imageAlt}
              width={1600}
              height={1008}
              className="h-[300px] w-full object-cover object-top transition-opacity duration-700 sm:h-[400px] md:h-full md:min-h-[520px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
