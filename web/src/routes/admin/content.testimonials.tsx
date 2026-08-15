import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import { Button, Grid, IconButton, Panel, SaveBar, TextField, Toggle, useDraft } from "@/components/velora/kit";
import { MediaPickerDialog, MediaThumb, SingleImageField } from "@/components/velora/MediaPicker";
import { mutateContent, useAdminState, useCan } from "@/lib/velora/store";
import type { Testimonial } from "@/lib/velora/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/content/testimonials")({
  head: () => ({
    meta: [
      { title: "Social proof & testimonials — Velora Admin" },
      { name: "description", content: "Edit the homepage social proof bar and manage every customer testimonial." },
      { property: "og:title", content: "Social proof & testimonials — Velora Admin" },
      { property: "og:description", content: "Edit the homepage social proof bar and testimonials." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TestimonialsScreen,
});

function newTestimonial(sort: number): Testimonial {
  return { id: `ts-${Date.now()}`, quote: "", author: "", stars: 5, avatarId: null, sort, active: true };
}

function Stars({ value, onChange, disabled }: { value: number; onChange?: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1" role={onChange ? "radiogroup" : undefined} aria-label="Stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange || disabled}
          aria-pressed={n <= value}
          onClick={() => onChange?.(n)}
          className="disabled:cursor-default"
        >
          <Star className={cn("size-4", n <= value ? "fill-gold text-gold" : "text-line")} />
        </button>
      ))}
    </div>
  );
}

function TestimonialsScreen() {
  const state = useAdminState();
  const can = useCan();
  const editable = can("content.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.content);
  const [saving, setSaving] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const save = () => {
    setSaving(true);
    mutateContent(
      (d) => {
        d.content.social = draft.social;
        d.content.testimonials = draft.testimonials;
      },
      { action: "content.testimonials.update", entity: "content.testimonials" },
    );
    commit();
    setSaving(false);
    toast.success("Social proof & testimonials saved");
  };

  const sorted = [...draft.testimonials].sort((a, b) => a.sort - b.sort);

  const move = (id: string, dir: -1 | 1) => {
    setDraft((d) => {
      const list = [...d.testimonials].sort((a, b) => a.sort - b.sort);
      const idx = list.findIndex((t) => t.id === id);
      const target = idx + dir;
      if (target < 0 || target >= list.length) return d;
      [list[idx], list[target]] = [list[target]!, list[idx]!];
      list.forEach((t, i) => (t.sort = i));
      return { ...d, testimonials: list };
    });
  };

  const update = (id: string, fn: (t: Testimonial) => void) => {
    setDraft((d) => {
      const next = structuredClone(d);
      const t = next.testimonials.find((x) => x.id === id);
      if (t) fn(t);
      return next;
    });
  };

  return (
    <AdminShell trail={[{ label: "Content", to: "/admin/content/promo" }, { label: "Testimonials" }]}>
      <div className="rise mb-6">
        <p className="eyebrow">Content studio</p>
        <h1 className="mt-1 text-[20px] font-semibold">Social proof & testimonials</h1>
        <p className="mt-1 max-w-[80ch] text-[13px] text-muted">The trust bar under the hero and the full testimonials list.</p>
      </div>

      <Grid cols={2}>
        <Panel title="Social proof bar">
          <div className="space-y-4">
            <TextField label="Title" value={draft.social.title} disabled={!editable} onChange={(e) => setDraft((d) => ({ ...d, social: { ...d.social, title: e.target.value } }))} />
            <TextField label="Rating label" value={draft.social.ratingLabel} disabled={!editable} onChange={(e) => setDraft((d) => ({ ...d, social: { ...d.social, ratingLabel: e.target.value } }))} />
            <div>
              <p className="eyebrow mb-1.5">Stars</p>
              <Stars value={draft.social.stars} onChange={(v) => editable && setDraft((d) => ({ ...d, social: { ...d.social, stars: v } }))} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="eyebrow">Avatars</p>
                {editable ? (
                  <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setAvatarPickerOpen(true)}>
                    Add avatar
                  </Button>
                ) : null}
              </div>
              <ul className="flex flex-wrap gap-2">
                {draft.social.avatarIds.map((id) => (
                  <li key={id} className="relative">
                    <MediaThumb id={id} className="size-12" />
                    {editable ? (
                      <IconButton
                        label="Remove avatar"
                        icon={<Trash2 className="size-3" />}
                        className="absolute -top-2 -right-2 size-6"
                        onClick={() => setDraft((d) => ({ ...d, social: { ...d.social, avatarIds: d.social.avatarIds.filter((a) => a !== id) } }))}
                      />
                    ) : null}
                  </li>
                ))}
                {draft.social.avatarIds.length === 0 ? <p className="text-[13px] text-muted">No avatars selected.</p> : null}
              </ul>
              <MediaPickerDialog
                open={avatarPickerOpen}
                onOpenChange={setAvatarPickerOpen}
                multiple
                onSelect={(ids) => setDraft((d) => ({ ...d, social: { ...d.social, avatarIds: [...d.social.avatarIds, ...ids.filter((i) => !d.social.avatarIds.includes(i))] } }))}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Preview">
          <div className="rounded-[14px] border border-line bg-bg-subtle p-6 text-center">
            <div className="flex justify-center -space-x-2">
              {draft.social.avatarIds.slice(0, 5).map((id) => (
                <MediaThumb key={id} id={id} className="size-9 rounded-full border-2 border-surface" />
              ))}
            </div>
            <p className="mt-3 text-[15px] font-semibold">{draft.social.title || "Social proof title"}</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <Stars value={draft.social.stars} />
              <span className="text-[12px] text-muted">{draft.social.ratingLabel}</span>
            </div>
          </div>
        </Panel>
      </Grid>

      <Panel
        title="Testimonials"
        description="Ordered as shown on the storefront."
        actions={
          editable ? (
            <Button
              size="sm"
              icon={<Plus className="size-3.5" />}
              onClick={() => setDraft((d) => ({ ...d, testimonials: [...d.testimonials, newTestimonial(d.testimonials.length)] }))}
            >
              Add testimonial
            </Button>
          ) : undefined
        }
      >
        {sorted.length === 0 ? (
          <p className="text-[13px] text-muted">No testimonials yet.</p>
        ) : (
          <ul className="space-y-4">
            {sorted.map((t, i) => (
              <li key={t.id} className="grid gap-4 rounded-[12px] border border-line p-4 lg:grid-cols-[auto_1fr_260px]">
                <div className="flex flex-row gap-2 lg:flex-col lg:items-center">
                  <IconButton label="Move up" icon={<span aria-hidden>↑</span>} onClick={() => move(t.id, -1)} disabled={i === 0 || !editable} />
                  <IconButton label="Move down" icon={<span aria-hidden>↓</span>} onClick={() => move(t.id, 1)} disabled={i === sorted.length - 1 || !editable} />
                  <SingleImageField label="" value={t.avatarId} onChange={(id) => update(t.id, (x) => (x.avatarId = id))} />
                </div>
                <div className="space-y-3">
                  <TextField label="Quote" value={t.quote} disabled={!editable} onChange={(e) => update(t.id, (x) => (x.quote = e.target.value))} />
                  <Grid cols={2}>
                    <TextField label="Author" value={t.author} disabled={!editable} onChange={(e) => update(t.id, (x) => (x.author = e.target.value))} />
                    <div>
                      <p className="eyebrow mb-1.5">Stars</p>
                      <Stars value={t.stars} onChange={(v) => editable && update(t.id, (x) => (x.stars = v))} />
                    </div>
                  </Grid>
                  <div className="flex items-center justify-between">
                    <Toggle on={t.active} onChange={(v) => update(t.id, (x) => (x.active = v))} label="Active" disabled={!editable} />
                    {editable ? (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="size-3.5" />}
                        onClick={() => setDraft((d) => ({ ...d, testimonials: d.testimonials.filter((x) => x.id !== t.id) }))}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-[10px] border border-line bg-bg-subtle p-4">
                  <Stars value={t.stars} />
                  <p className="mt-2 text-[13px] italic">“{t.quote || "Quote text"}”</p>
                  <div className="mt-3 flex items-center gap-2">
                    <MediaThumb id={t.avatarId} className="size-8 rounded-full" />
                    <p className="text-[12px] text-muted">{t.author || "Author name"}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {editable ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} saving={saving} /> : null}
    </AdminShell>
  );
}
