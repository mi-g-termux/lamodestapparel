import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeading, pageMeta } from "@/components/SiteShell";
import { emailPreviews, emailTemplates } from "@/lib/emails";

export const Route = createFileRoute("/emails")({
  head: () => ({
    ...pageMeta("Email Templates", "Preview every branded Velora transactional email template."),
    meta: [
      ...pageMeta("Email Templates", "Preview every branded Velora transactional email template.").meta,
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailsPage,
});

function EmailsPage() {
  return (
    <SiteShell>
      <PageHeading
        eyebrow="Developer gallery"
        title="Email templates"
        body="Every notification the storefront sends, rendered from the same brand tokens as the site."
        crumbs={[{ label: "Email Templates" }]}
      />
      <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-2">
          {emailPreviews.map(({ name, result }) => (
            <article key={name} className="border border-border">
              <header className="border-b border-border bg-cream px-5 py-4">
                <h2 className="text-[14px]">{emailTemplates[name].displayName}</h2>
                <p className="mt-1 text-[12px] text-muted-foreground">Subject: {result.subject}</p>
              </header>
              <iframe
                title={`${name} preview`}
                srcDoc={result.html}
                className="h-[560px] w-full bg-background"
              />
            </article>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
