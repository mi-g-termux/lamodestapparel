import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  ColourField,
  ConfirmDialog,
  Grid,
  InlineBanner,
  Panel,
  SaveBar,
  SelectField,
  TextField,
  Toggle,
  useDraft,
} from "@/components/velora/kit";
import { MediaThumb, SingleImageField } from "@/components/velora/MediaPicker";
import { mutateContent, useAdminState, useCan, mediaUrl } from "@/lib/velora/store";
import { toast } from "sonner";
import type { Banner } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/content/promo")({
  head: () => ({
    meta: [
      { title: "Promo & banners — Velora Admin" },
      { name: "description", content: "Edit the homepage promo strip and manage every scheduled banner on the storefront." },
      { property: "og:title", content: "Promo & banners — Velora Admin" },
      { property: "og:description", content: "Edit the homepage promo strip and manage every scheduled banner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PromoScreen,
});

const placements: Banner["placement"][] = ["Home hero", "Category top", "PDP strip", "Cart", "Checkout", "Sitewide"];

function newBanner(): Banner {
  return {
    id: `b-${Date.now()}`,
    name: "New banner",
    placement: "Sitewide",
    desktopImageId: null,
    mobileImageId: null,
    heading: "",
    body: "",
    ctaLabel: "",
    ctaHref: "",
    startsAt: null,
    endsAt: null,
    priority: 1,
    active: false,
  };
}

function overlaps(a: Banner, b: Banner) {
  const aStart = a.startsAt ? new Date(a.startsAt).getTime() : -Infinity;
  const aEnd = a.endsAt ? new Date(a.endsAt).getTime() : Infinity;
  const bStart = b.startsAt ? new Date(b.startsAt).getTime() : -Infinity;
  const bEnd = b.endsAt ? new Date(b.endsAt).getTime() : Infinity;
  return aStart <= bEnd && bStart <= aEnd;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

function PromoScreen() {
  const state = useAdminState();
  const can = useCan();
  const editable = can("content.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.content);
  const [saving, setSaving] = useState(false);
  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(state.content.banners[0]?.id ?? null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const save = () => {
    setSaving(true);
    mutateContent(
      (d) => {
        d.content.promo = draft.promo;
        d.content.banners = draft.banners;
      },
      { action: "content.promo.update", entity: "content.promo" },
    );
    commit();
    setSaving(false);
    toast.success("Promo & banners saved");
  };

  const promoImageUrl = mediaUrl(state, draft.promo.imageId);
  const selectedBanner = draft.banners.find((b) => b.id === selectedBannerId) ?? null;

  const updateBanner = (id: string, fn: (b: Banner) => void) => {
    setDraft((d) => {
      const next = structuredClone(d);
      const b = next.banners.find((x) => x.id === id);
      if (b) fn(b);
      return next;
    });
  };

  const overlapWarning = (b: Banner) => {
    if (!b.active) return null;
    const clash = draft.banners.find((o) => o.id !== b.id && o.placement === b.placement && o.active && overlaps(o, b));
    return clash ? `Overlaps with "${clash.name}" in the same placement` : null;
  };

  return (
    <AdminShell trail={[{ label: "Content", to: "/admin/content/promo" }, { label: "Promo & banners" }]}>
      <div className="rise mb-6">
        <p className="eyebrow">Content studio</p>
        <h1 className="mt-1 text-[20px] font-semibold">Promo strip & banners</h1>
        <p className="mt-1 max-w-[80ch] text-[13px] text-muted">
          The homepage promo strip and the sitewide banner rotation shoppers see across placements.
        </p>
      </div>

      <Grid cols={2}>
        <Panel title="Promo strip" description="The homepage promotional block, above the footer.">
          <div className="space-y-4">
            <TextField label="Eyebrow" value={draft.promo.eyebrow} disabled={!editable} onChange={(e) => setDraft((d) => ({ ...d, promo: { ...d.promo, eyebrow: e.target.value } }))} />
            <Grid cols={2}>
              <TextField label="Title line 1" value={draft.promo.titleLine1} disabled={!editable} onChange={(e) => setDraft((d) => ({ ...d, promo: { ...d.promo, titleLine1: e.target.value } }))} />
              <TextField label="Title line 2" value={draft.promo.titleLine2} disabled={!editable} onChange={(e) => setDraft((d) => ({ ...d, promo: { ...d.promo, titleLine2: e.target.value } }))} />
            </Grid>
            <Grid cols={2}>
              <TextField label="CTA label" value={draft.promo.ctaLabel} disabled={!editable} onChange={(e) => setDraft((d) => ({ ...d, promo: { ...d.promo, ctaLabel: e.target.value } }))} />
              <TextField label="CTA link" value={draft.promo.ctaHref} disabled={!editable} onChange={(e) => setDraft((d) => ({ ...d, promo: { ...d.promo, ctaHref: e.target.value } }))} />
            </Grid>
            <SingleImageField label="Image" value={draft.promo.imageId} onChange={(id) => setDraft((d) => ({ ...d, promo: { ...d.promo, imageId: id } }))} />
            <TextField label="Alt text" value={draft.promo.alt} disabled={!editable} onChange={(e) => setDraft((d) => ({ ...d, promo: { ...d.promo, alt: e.target.value } }))} />
            <ColourField label="Wash colour" value={draft.promo.wash} onChange={(v) => setDraft((d) => ({ ...d, promo: { ...d.promo, wash: v } }))} />
            <Grid cols={2}>
              <TextField
                label="Starts"
                type="datetime-local"
                value={toLocalInput(draft.promo.startsAt)}
                disabled={!editable}
                onChange={(e) => setDraft((d) => ({ ...d, promo: { ...d.promo, startsAt: fromLocalInput(e.target.value) } }))}
              />
              <TextField
                label="Ends"
                type="datetime-local"
                value={toLocalInput(draft.promo.endsAt)}
                disabled={!editable}
                onChange={(e) => setDraft((d) => ({ ...d, promo: { ...d.promo, endsAt: fromLocalInput(e.target.value) } }))}
              />
            </Grid>
            <Toggle on={draft.promo.active} onChange={(v) => setDraft((d) => ({ ...d, promo: { ...d.promo, active: v } }))} label="Active" description="Show on the storefront homepage" disabled={!editable} />
          </div>
        </Panel>

        <Panel title="Preview" description="Approximate rendering — the storefront may adjust spacing.">
          <div className="overflow-hidden rounded-[14px] border border-line" style={{ backgroundColor: draft.promo.wash }}>
            <div className="grid gap-4 p-6 sm:grid-cols-2 sm:items-center">
              <div>
                <p className="eyebrow">{draft.promo.eyebrow || "Eyebrow"}</p>
                <p className="mt-2 text-[24px] leading-tight font-semibold">
                  {draft.promo.titleLine1 || "Title line 1"}
                  <br />
                  {draft.promo.titleLine2 || "Title line 2"}
                </p>
                <span className="btn btn-primary mt-4 inline-flex w-fit">{draft.promo.ctaLabel || "CTA label"}</span>
              </div>
              {promoImageUrl ? (
                <img src={promoImageUrl} alt={draft.promo.alt} className="aspect-[4/3] w-full rounded-[10px] object-cover" />
              ) : (
                <MediaThumb id={draft.promo.imageId} className="aspect-[4/3] w-full" />
              )}
            </div>
          </div>
          <p className="mt-3 text-[12px] text-muted">{draft.promo.active ? "Currently active" : "Currently inactive"}</p>
        </Panel>
      </Grid>

      <Panel
        title="Banners"
        description="Scheduled banners across every placement on the storefront."
        actions={
          editable ? (
            <Button
              size="sm"
              icon={<Plus className="size-3.5" />}
              onClick={() => {
                const b = newBanner();
                setDraft((d) => ({ ...d, banners: [b, ...d.banners] }));
                setSelectedBannerId(b.id);
              }}
            >
              Add banner
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <ul className="space-y-2">
            {draft.banners.length === 0 ? <p className="text-[13px] text-muted">No banners yet.</p> : null}
            {draft.banners.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setSelectedBannerId(b.id)}
                  className={`block w-full rounded-[10px] border px-3 py-2 text-left transition-colors ${
                    selectedBannerId === b.id ? "border-gold bg-cream" : "border-line hover:border-clay"
                  }`}
                >
                  <p className="truncate text-[13px] font-medium">{b.name}</p>
                  <p className="truncate text-[12px] text-muted">
                    {b.placement} · priority {b.priority} · {b.active ? "Active" : "Inactive"}
                  </p>
                  {overlapWarning(b) ? <p className="mt-1 text-[11px] text-bad">Overlap warning</p> : null}
                </button>
              </li>
            ))}
          </ul>

          {selectedBanner ? (
            <div className="space-y-4">
              {overlapWarning(selectedBanner) ? (
                <InlineBanner tone="warn" title="Schedule overlap" body={overlapWarning(selectedBanner) ?? undefined} />
              ) : null}
              <Grid cols={2}>
                <TextField
                  label="Name"
                  value={selectedBanner.name}
                  disabled={!editable}
                  onChange={(e) => updateBanner(selectedBanner.id, (b) => (b.name = e.target.value))}
                />
                <SelectField
                  label="Placement"
                  value={selectedBanner.placement}
                  disabled={!editable}
                  options={placements.map((p) => ({ value: p, label: p }))}
                  onChange={(e) => updateBanner(selectedBanner.id, (b) => (b.placement = e.target.value as Banner["placement"]))}
                />
              </Grid>
              <Grid cols={2}>
                <SingleImageField label="Desktop image" value={selectedBanner.desktopImageId} onChange={(id) => updateBanner(selectedBanner.id, (b) => (b.desktopImageId = id))} />
                <SingleImageField label="Mobile image" value={selectedBanner.mobileImageId} onChange={(id) => updateBanner(selectedBanner.id, (b) => (b.mobileImageId = id))} />
              </Grid>
              <TextField label="Heading" value={selectedBanner.heading} disabled={!editable} onChange={(e) => updateBanner(selectedBanner.id, (b) => (b.heading = e.target.value))} />
              <TextField label="Body" value={selectedBanner.body} disabled={!editable} onChange={(e) => updateBanner(selectedBanner.id, (b) => (b.body = e.target.value))} />
              <Grid cols={2}>
                <TextField label="CTA label" value={selectedBanner.ctaLabel} disabled={!editable} onChange={(e) => updateBanner(selectedBanner.id, (b) => (b.ctaLabel = e.target.value))} />
                <TextField label="CTA link" value={selectedBanner.ctaHref} disabled={!editable} onChange={(e) => updateBanner(selectedBanner.id, (b) => (b.ctaHref = e.target.value))} />
              </Grid>
              <Grid cols={2}>
                <TextField
                  label="Starts"
                  type="datetime-local"
                  value={toLocalInput(selectedBanner.startsAt)}
                  disabled={!editable}
                  onChange={(e) => updateBanner(selectedBanner.id, (b) => (b.startsAt = fromLocalInput(e.target.value)))}
                />
                <TextField
                  label="Ends"
                  type="datetime-local"
                  value={toLocalInput(selectedBanner.endsAt)}
                  disabled={!editable}
                  onChange={(e) => updateBanner(selectedBanner.id, (b) => (b.endsAt = fromLocalInput(e.target.value)))}
                />
              </Grid>
              <Grid cols={2}>
                <TextField
                  label="Priority"
                  type="number"
                  value={selectedBanner.priority}
                  disabled={!editable}
                  onChange={(e) => updateBanner(selectedBanner.id, (b) => (b.priority = Number(e.target.value) || 0))}
                />
                <Toggle on={selectedBanner.active} onChange={(v) => updateBanner(selectedBanner.id, (b) => (b.active = v))} label="Active" disabled={!editable} />
              </Grid>
              {editable ? (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="size-3.5" />}
                  onClick={() => setConfirmDelete(selectedBanner.id)}
                >
                  Delete banner
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-[13px] text-muted">Select a banner to edit it.</p>
          )}
        </div>
      </Panel>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete banner"
        body="This banner will be removed once you save changes."
        destructive
        confirmLabel="Delete"
        onConfirm={() => {
          setDraft((d) => ({ ...d, banners: d.banners.filter((b) => b.id !== confirmDelete) }));
          if (selectedBannerId === confirmDelete) setSelectedBannerId(null);
        }}
      />

      {editable ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} saving={saving} /> : null}
    </AdminShell>
  );
}
