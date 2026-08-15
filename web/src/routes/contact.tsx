import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/content/site";
import { SiteShell, PageHeading, pageMeta } from "@/components/SiteShell";
import { Field, inputClass, btnPrimary, Panel } from "@/components/kit";

export const Route = createFileRoute("/contact")({
  head: () => pageMeta("Contact Us", "Reach the Velora care team by email, phone or the contact form."),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <SiteShell>
      <PageHeading
        eyebrow="Client care"
        title="Contact us"
        body="Our team replies within one working day."
        crumbs={[{ label: "Contact" }]}
      />
      <div className="mx-auto grid max-w-[1000px] gap-10 px-6 py-10 md:grid-cols-[minmax(0,1fr)_280px] md:py-14">
        <Panel>
          {sent ? (
            <div>
              <h2 className="font-display text-[24px]">Message received</h2>
              <p className="mt-2 text-[13.5px] text-muted-foreground">
                A confirmation is on its way to your inbox. We reply within one working day.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="space-y-5"
            >
              <Field label="Name">
                <input required className={inputClass} />
              </Field>
              <Field label="Email">
                <input required type="email" className={inputClass} />
              </Field>
              <Field label="Order number" hint="Optional — helps us answer faster.">
                <input className={inputClass} />
              </Field>
              <Field label="Message">
                <textarea required rows={5} className={inputClass} />
              </Field>
              <button type="submit" className={`${btnPrimary} w-full sm:w-auto`}>
                Send message
              </button>
            </form>
          )}
        </Panel>

        <aside className="space-y-6 text-[13px]">
          <div>
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Email</p>
            <p className="mt-1.5">{site.company.email}</p>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Phone</p>
            <p className="mt-1.5">{site.company.phone}</p>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Hours</p>
            <p className="mt-1.5">{site.company.hours}</p>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Studio</p>
            <p className="mt-1.5 text-muted-foreground">{site.company.address}</p>
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}
