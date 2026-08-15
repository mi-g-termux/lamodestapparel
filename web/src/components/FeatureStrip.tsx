import { site } from "@/content/site";
import { iconMap } from "@/components/icons";

export function FeatureStrip() {
  return (
    <section className="mx-auto max-w-[1200px] px-6">
      <ul className="grid grid-cols-2 divide-clay/60 border-b border-clay/60 md:grid-cols-4 md:divide-x">
        {site.features.map((f) => {
          const Icon = iconMap[f.icon];
          return (
            <li key={f.title} className="flex items-center gap-3 px-2 py-6 md:justify-center md:px-6">
              <Icon className="size-6 shrink-0 text-gold" strokeWidth={1.25} />
              <div>
                <p className="text-[12.5px] font-medium">{f.title}</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{f.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
