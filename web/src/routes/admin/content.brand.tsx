import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  ColourField,
  Grid,
  Labelled,
  PageHeader,
  Panel,
  SaveBar,
  SelectField,
  TextField,
  Toggle,
  useDraft,
} from "@/components/velora/kit";
import { MediaThumb, SingleImageField } from "@/components/velora/MediaPicker";
import { mediaUrl, mutateContent, useAdminState, useCan } from "@/lib/velora/store";
import type { Content } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/content/brand")({
  head: () => ({
    meta: [
      { title: "Brand identity — Velora Admin" },
      { name: "description", content: "Wordmark, tagline, logo variants, favicon and social preview for the storefront." },
      { property: "og:title", content: "Brand identity — Velora Admin" },
      { property: "og:description", content: "Wordmark, tagline, logo variants, favicon and social preview for the storefront." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BrandScreen,
});

const faviconSizes = ["16", "32", "48", "180", "192", "512"];

function BrandScreen() {
  const state = useAdminState();
  const can = useCan();
  const canWrite = can("content.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.content.brand);

  const save = () => {
    mutateContent(
      (d) => {
        d.content.brand = draft;
      },
      { action: "content.brand.update", entity: "Brand identity", before: state.content.brand, after: draft },
    );
    commit();
    toast.success("Brand identity saved");
  };

  const setField = <K extends keyof Content["brand"]>(key: K, value: Content["brand"][K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const logoUrl = mediaUrl(state, draft.logoId);
  const faviconUrl = mediaUrl(state, draft.faviconId);
  const ogUrl = mediaUrl(state, draft.ogImageId);

  return (
    <AdminShell trail={[{ label: "Content", to: "/admin/content/brand" }, { label: "Brand" }]}>
      <PageHeader
        eyebrow="Content studio"
        title="Brand identity"
        sub="The wordmark, tagline, logo variants and favicon shoppers see everywhere in the store."
      />

      <Grid cols={2}>
        <Panel title="Wordmark & tagline">
          <div className="space-y-4">
            <TextField
              label="Wordmark text"
              value={draft.wordmark}
              disabled={!canWrite}
              onChange={(e) => setField("wordmark", e.target.value)}
            />
            <Toggle
              on={draft.useWordmark}
              onChange={(v) => setField("useWordmark", v)}
              label="Use text wordmark"
              description="When off, the header shows the logo image instead of typed text."
              disabled={!canWrite}
            />
            <TextField
              label="Tagline"
              value={draft.tagline}
              disabled={!canWrite}
              onChange={(e) => setField("tagline", e.target.value)}
            />
            <Toggle
              on={draft.taglineVisible}
              onChange={(v) => setField("taglineVisible", v)}
              label="Show tagline"
              disabled={!canWrite}
            />
            <TextField
              label="Tagline letter-spacing"
              helper="CSS letter-spacing value, e.g. 0.3em"
              value={draft.taglineTracking}
              disabled={!canWrite}
              onChange={(e) => setField("taglineTracking", e.target.value)}
            />
            <TextField
              label="Logo alt text"
              value={draft.logoAlt}
              disabled={!canWrite}
              onChange={(e) => setField("logoAlt", e.target.value)}
            />
            <Labelled label="Logo max height (px)">
              {({ id }) => (
                <input
                  id={id}
                  type="number"
                  min={12}
                  max={96}
                  className="field tnum"
                  disabled={!canWrite}
                  value={draft.logoMaxHeight}
                  onChange={(e) => setField("logoMaxHeight", Number(e.target.value))}
                />
              )}
            </Labelled>
          </div>
        </Panel>

        <Panel title="Header lockup preview" description="Approximates how the wordmark and tagline appear in the storefront header.">
          <div className="flex h-full flex-col justify-center rounded-[14px] border border-line bg-bg-subtle p-8 text-center">
            {draft.useWordmark ? (
              <p className="text-[26px] font-semibold tracking-[0.08em]">{draft.wordmark || "WORDMARK"}</p>
            ) : logoUrl ? (
              <img src={logoUrl} alt={draft.logoAlt} style={{ maxHeight: draft.logoMaxHeight }} className="mx-auto object-contain" />
            ) : (
              <p className="text-[13px] text-muted">No logo selected</p>
            )}
            {draft.taglineVisible ? (
              <p className="mt-2 text-[11px] text-muted uppercase" style={{ letterSpacing: draft.taglineTracking }}>
                {draft.tagline}
              </p>
            ) : null}
          </div>
        </Panel>
      </Grid>

      <Panel title="Logo variants" description="Each placement can use a different asset — header, dark backgrounds, compact nav, emails and invoices.">
        <Grid cols={3}>
          <SingleImageField label="Primary logo" value={draft.logoId} onChange={(v) => setField("logoId", v)} />
          <SingleImageField label="Light background logo" value={draft.logoLightId} onChange={(v) => setField("logoLightId", v)} />
          <SingleImageField label="Dark background logo" value={draft.logoDarkId} onChange={(v) => setField("logoDarkId", v)} />
          <SingleImageField label="Compact / mobile logo" value={draft.logoCompactId} onChange={(v) => setField("logoCompactId", v)} />
          <SingleImageField label="Email logo" value={draft.logoEmailId} onChange={(v) => setField("logoEmailId", v)} />
          <SingleImageField label="Invoice logo" value={draft.logoInvoiceId} onChange={(v) => setField("logoInvoiceId", v)} />
        </Grid>
      </Panel>

      <Grid cols={2}>
        <Panel title="Favicon & theme colour">
          <div className="space-y-4">
            <SingleImageField label="Favicon source" value={draft.faviconId} onChange={(v) => setField("faviconId", v)} />
            <ColourField label="Browser theme colour" value={draft.themeColour} onChange={(v) => setField("themeColour", v)} />
            <div>
              <p className="eyebrow mb-2">Favicon overrides by size</p>
              <div className="space-y-2">
                {faviconSizes.map((size) => (
                  <div key={size} className="flex items-center gap-3 rounded-[10px] border border-line p-2">
                    <MediaThumb id={draft.faviconOverrides[size] ?? draft.faviconId} className="size-8 shrink-0" />
                    <span className="w-16 shrink-0 text-[12px] text-muted">{size}px</span>
                    <div className="flex-1">
                      <SingleImageField
                        label={`${size}px override`}
                        value={draft.faviconOverrides[size] ?? null}
                        onChange={(v) =>
                          setDraft((d) => ({ ...d, faviconOverrides: { ...d.faviconOverrides, [size]: v } }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Favicon & social preview">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-[10px] border border-line bg-bg-subtle p-3">
              <MediaThumb id={draft.faviconId} className="size-8 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-[13px]">{draft.wordmark || "Untitled store"}</p>
                <p className="truncate text-[11px] text-muted">example.com</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-[12px] border border-line">
              <div className="aspect-[1.91/1] bg-bg-subtle">
                {ogUrl ? (
                  <img src={ogUrl} alt="Social share preview" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-[12px] text-muted">No social image set</div>
                )}
              </div>
              <div className="space-y-1 p-3">
                <p className="truncate text-[11px] text-muted uppercase">example.com</p>
                <p className="truncate text-[13px] font-medium">{draft.wordmark}</p>
                <p className="truncate text-[12px] text-muted">{draft.tagline}</p>
              </div>
            </div>
            <SelectField
              label="Twitter card type"
              value={draft.twitterCard}
              onChange={(e) => setField("twitterCard", e.target.value as Content["brand"]["twitterCard"])}
              options={[
                { value: "summary", label: "Summary" },
                { value: "summary_large_image", label: "Summary — large image" },
              ]}
            />
            <SingleImageField label="Default social share image (og:image)" value={draft.ogImageId} onChange={(v) => setField("ogImageId", v)} />
          </div>
        </Panel>
      </Grid>

      <Panel title="Brand illustrations">
        <Grid cols={3}>
          <SingleImageField label="Splash / loading mark" value={draft.splashMarkId} onChange={(v) => setField("splashMarkId", v)} />
          <SingleImageField label="404 illustration" value={draft.illustration404Id} onChange={(v) => setField("illustration404Id", v)} />
          <SingleImageField label="Empty cart illustration" value={draft.emptyCartId} onChange={(v) => setField("emptyCartId", v)} />
        </Grid>
      </Panel>

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} note="Unsaved brand identity changes." /> : null}
    </AdminShell>
  );
}
