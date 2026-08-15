import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import { Grid, Panel, SaveBar, TextArea, TextField, useDraft } from "@/components/velora/kit";
import { mutateContent, useAdminState, useCan } from "@/lib/velora/store";

export const Route = createFileRoute("/admin/content/newsletter")({
  head: () => ({
    meta: [
      { title: "Newsletter block — Velora Admin" },
      { name: "description", content: "Edit the storefront newsletter signup wording and preview it live." },
      { property: "og:title", content: "Newsletter block — Velora Admin" },
      { property: "og:description", content: "Edit the storefront newsletter signup wording." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewsletterScreen,
});

function NewsletterScreen() {
  const state = useAdminState();
  const can = useCan();
  const editable = can("content.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.content.newsletter);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<"idle" | "success" | "error">("idle");

  const save = () => {
    setSaving(true);
    mutateContent(
      (d) => {
        d.content.newsletter = draft;
      },
      { action: "content.newsletter.update", entity: "content.newsletter" },
    );
    commit();
    setSaving(false);
    toast.success("Newsletter block saved");
  };

  return (
    <AdminShell trail={[{ label: "Content", to: "/admin/content/promo" }, { label: "Newsletter" }]}>
      <div className="rise mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Content studio</p>
          <h1 className="mt-1 text-[20px] font-semibold">Newsletter block</h1>
          <p className="mt-1 max-w-[80ch] text-[13px] text-muted">The signup band shown near the footer of every storefront page.</p>
        </div>
        <Link to="/admin/subscribers" className="btn btn-ghost">
          View subscribers
        </Link>
      </div>

      <Grid cols={2}>
        <Panel title="Wording">
          <div className="space-y-4">
            <TextField label="Title" value={draft.title} disabled={!editable} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <TextArea label="Body" value={draft.body} disabled={!editable} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <TextField label="Email placeholder" value={draft.placeholder} disabled={!editable} onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })} />
            <TextField label="CTA label" value={draft.ctaLabel} disabled={!editable} onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })} />
            <TextField label="Consent note" value={draft.consentNote} disabled={!editable} onChange={(e) => setDraft({ ...draft, consentNote: e.target.value })} />
            <TextField label="Success message" value={draft.successMessage} disabled={!editable} onChange={(e) => setDraft({ ...draft, successMessage: e.target.value })} />
            <TextField label="Error message" value={draft.errorMessage} disabled={!editable} onChange={(e) => setDraft({ ...draft, errorMessage: e.target.value })} />
            <TextField
              label="Subscriber list"
              helper="The list new subscribers are added to."
              value={draft.list}
              disabled={!editable}
              onChange={(e) => setDraft({ ...draft, list: e.target.value })}
            />
          </div>
        </Panel>

        <Panel title="Live preview" description="Try the states a shopper would see.">
          <div className="rounded-[14px] border border-line bg-bg-subtle p-6 text-center">
            <p className="text-[16px] font-semibold">{draft.title || "Newsletter title"}</p>
            <p className="mx-auto mt-2 max-w-[42ch] text-[13px] text-muted">{draft.body || "Newsletter body copy"}</p>
            <form
              className="mx-auto mt-4 flex max-w-sm gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setPreview("success");
              }}
            >
              <input className="field" placeholder={draft.placeholder || "you@example.com"} aria-label="Email address" />
              <button type="submit" className="btn btn-primary shrink-0">
                {draft.ctaLabel || "Subscribe"}
              </button>
            </form>
            <p className="mt-2 text-[11px] text-muted">{draft.consentNote}</p>
            {preview === "success" ? <p className="mt-3 text-[13px] text-ok">{draft.successMessage || "Success message"}</p> : null}
            <div className="mt-3 flex justify-center gap-2">
              <button type="button" className="pill bg-cream text-ink" onClick={() => setPreview("success")}>
                Preview success
              </button>
              <button type="button" className="pill bg-bad-bg text-bad" onClick={() => setPreview("error")}>
                Preview error
              </button>
            </div>
            {preview === "error" ? <p className="mt-2 text-[13px] text-bad">{draft.errorMessage || "Error message"}</p> : null}
          </div>
        </Panel>
      </Grid>

      {editable ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} saving={saving} /> : null}
    </AdminShell>
  );
}
