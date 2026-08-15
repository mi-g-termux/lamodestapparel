import { site } from "@/content/site";
import { Stars } from "@/components/Stars";
import { QuoteIcon } from "@/components/icons";

export function Testimonials() {
  const { title, ratingLabel, stars, avatars } = site.social;

  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-12 md:pt-16">
      <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:gap-6">
        <h2 className="section-title">{title}</h2>
        <div className="flex items-center gap-2">
          <Stars value={stars} size={14} />
          <span className="text-[12.5px] text-muted-foreground">{ratingLabel}</span>
        </div>
        <ul className="flex md:ml-auto">
          {avatars.map((src, i) => (
            <li key={src} className="-ml-2 first:ml-0" style={{ zIndex: avatars.length - i }}>
              <img
                src={src}
                alt=""
                loading="lazy"
                width={64}
                height={64}
                className="size-8 rounded-full border-2 border-background object-cover"
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto md:mt-6 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible">
        {site.testimonials.map((t) => (
          <figure
            key={t.author}
            className="w-[80vw] shrink-0 snap-start bg-cream p-6 md:w-auto"
          >
            <QuoteIcon className="size-5 text-clay" />
            <blockquote className="mt-3 text-[13px] leading-[1.8] text-muted-foreground">
              {t.quote}
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <img
                src={t.avatar}
                alt=""
                loading="lazy"
                width={64}
                height={64}
                className="size-9 rounded-full object-cover"
              />
              <span>
                <span className="block text-[12.5px] font-medium">{t.author}</span>
                <Stars value={t.stars} />
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
