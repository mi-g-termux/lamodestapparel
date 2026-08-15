import type { ReactNode } from "react";
import { SiteShell, PageHeading } from "@/components/SiteShell";
import { Accordion } from "@/components/kit";

export function ContentPage({
  eyebrow,
  title,
  body,
  sections,
  faq,
  children,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  sections?: { title: string; body: string }[];
  faq?: { title: string; body: string }[];
  children?: ReactNode;
}) {
  return (
    <SiteShell>
      <PageHeading
        {...(eyebrow ? { eyebrow } : {})}
        title={title}
        {...(body ? { body } : {})}
        crumbs={[{ label: title }]}
      />
      <div className="mx-auto max-w-[860px] px-6 py-10 md:py-14">
        {sections?.map((s) => (
          <section key={s.title} className="mb-9 last:mb-0">
            <h2 className="section-title">{s.title}</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
          </section>
        ))}
        {faq ? <Accordion items={faq} defaultOpen={0} /> : null}
        {children}
      </div>
    </SiteShell>
  );
}
