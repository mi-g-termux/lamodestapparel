import { createFileRoute } from "@tanstack/react-router";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  ColourField,
  EmptyState,
  Grid,
  IconButton,
  Labelled,
  PageHeader,
  Panel,
  SaveBar,
  SelectField,
  TextArea,
  TextField,
  Toggle,
  useDraft,
} from "@/components/velora/kit";
import { MediaThumb, SingleImageField } from "@/components/velora/MediaPicker";
import { mediaUrl, mutateContent, useAdminState, useCan } from "@/lib/velora/store";
import type { HeroSlide } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/content/hero")({
  head: () => ({
    meta: [
      { title: "Hero slider — Velora Admin" },
      { name: "description", content: "Homepage hero slides, autoplay settings and desktop/mobile preview." },
      { property: "og:title", content: "Hero slider — Velora Admin" },
      { property: "og:description", content: "Homepage hero slides, autoplay settings and desktop/mobile preview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HeroScreen,
});

function toLocalInput(iso: string | null): string {
  return iso ? iso.slice(0, 16) : "";
}

function newSlide(sort: number): HeroSlide {
  return {
    id: `h-${Date.now()}`,
    eyebrow: "",
    titleLine1: "New slide",
    titleLine2: "",
    body: "",
    ctaLabel: "Shop now",
    ctaHref: "/shop",
    imageId: null,
    alt: "",
    align: "left",
    overlay: 0.25,
    textColour: "#ffffff",
    sort,
    active: true,
    startsAt: null,
    endsAt: null,
  };
}

function HeroScreen() {
  const state = useAdminState();
  const can = useCan();
  const canWrite = can("content.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.content.hero);

  const save = () => {
    mutateContent(
      (d) => {
        d.content.hero = draft;
      },
      { action: "content.hero.update", entity: "Hero slider", before: state.content.hero, after: draft },
    );
    commit();
    toast.success("Hero slider saved");
  };

  const slides = [...draft.slides].sort((a, b) => a.sort - b.sort);
  const updateSlide = (id: string, patch: Partial<HeroSlide>) =>
    setDraft((d) => ({ ...d, slides: d.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const removeSlide = (id: string) => setDraft((d) => ({ ...d, slides: d.slides.filter((s) => s.id !== id) }));
  const duplicateSlide = (id: string) =>
    setDraft((d) => {
      const src = d.slides.find((s) => s.id === id);
      if (!src) return d;
      const maxSort = Math.max(0, ...d.slides.map((s) => s.sort));
      return { ...d, slides: [...d.slides, { ...src, id: `h-${Date.now()}`, sort: maxSort + 1 }] };
    });
  const move = (id: string, dir: -1 | 1) =>
    setDraft((d) => {
      const sorted = [...d.slides].sort((a, b) => a.sort - b.sort);
      const idx = sorted.findIndex((s) => s.id === id);
      const target = idx + dir;
      if (target < 0 || target >= sorted.length) return d;
      const a = sorted[idx]!;
      const b = sorted[target]!;
      const swap = a.sort;
      a.sort = b.sort;
      b.sort = swap;
      return { ...d, slides: sorted };
    });
  const addSlide = () => {
    const maxSort = Math.max(-1, ...draft.slides.map((s) => s.sort));
    setDraft((d) => ({ ...d, slides: [...d.slides, newSlide(maxSort + 1)] }));
  };

  return (
    <AdminShell trail={[{ label: "Content", to: "/admin/content/brand" }, { label: "Hero" }]}>
      <PageHeader
        eyebrow="Content studio"
        title="Hero slider"
        sub="The rotating banner at the top of the homepage."
        actions={canWrite ? <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={addSlide}>Add slide</Button> : null}
      />

      <Panel title="Autoplay">
        <Grid cols={2}>
          <Toggle on={draft.autoplay} onChange={(v) => setDraft((d) => ({ ...d, autoplay: v }))} label="Autoplay" />
          <Labelled label="Interval (ms)">
            {({ id }) => (
              <input id={id} type="number" step={100} className="field tnum" value={draft.intervalMs} onChange={(e) => setDraft((d) => ({ ...d, intervalMs: Number(e.target.value) }))} />
            )}
          </Labelled>
        </Grid>
      </Panel>

      {slides.length === 0 ? (
        <Panel>
          <EmptyState title="No slides yet" body="Add a slide to populate the homepage hero." action={canWrite ? <Button onClick={addSlide}>Add slide</Button> : undefined} />
        </Panel>
      ) : (
        <div className="space-y-4">
          {slides.map((s, i) => {
            const url = mediaUrl(state, s.imageId);
            return (
              <Panel
                key={s.id}
                title={`${s.titleLine1}${s.titleLine2 ? " " + s.titleLine2 : ""}` || "Untitled slide"}
                actions={
                  canWrite ? (
                    <div className="flex gap-1">
                      <IconButton label="Move up" icon={<span aria-hidden>↑</span>} onClick={() => move(s.id, -1)} />
                      <IconButton label="Move down" icon={<span aria-hidden>↓</span>} onClick={() => move(s.id, 1)} />
                      <IconButton label="Duplicate" icon={<Copy className="size-4" />} onClick={() => duplicateSlide(s.id)} />
                      <IconButton label="Remove" icon={<Trash2 className="size-4" />} onClick={() => removeSlide(s.id)} />
                    </div>
                  ) : null
                }
              >
                <Grid cols={2}>
                  <div className="space-y-3">
                    <TextField label="Eyebrow" value={s.eyebrow} onChange={(e) => updateSlide(s.id, { eyebrow: e.target.value })} />
                    <TextField label="Title line 1" value={s.titleLine1} onChange={(e) => updateSlide(s.id, { titleLine1: e.target.value })} />
                    <TextField label="Title line 2" value={s.titleLine2} onChange={(e) => updateSlide(s.id, { titleLine2: e.target.value })} />
                    <TextArea label="Body" rows={3} value={s.body} onChange={(e) => updateSlide(s.id, { body: e.target.value })} />
                    <TextField label="CTA label" value={s.ctaLabel} onChange={(e) => updateSlide(s.id, { ctaLabel: e.target.value })} />
                    <TextField label="CTA link" value={s.ctaHref} onChange={(e) => updateSlide(s.id, { ctaHref: e.target.value })} />
                    <SingleImageField label="Image" value={s.imageId} onChange={(v) => updateSlide(s.id, { imageId: v })} />
                    <TextField label="Alt text" value={s.alt} onChange={(e) => updateSlide(s.id, { alt: e.target.value })} />
                    <SelectField
                      label="Text alignment"
                      value={s.align}
                      onChange={(e) => updateSlide(s.id, { align: e.target.value as HeroSlide["align"] })}
                      options={[
                        { value: "left", label: "Left" },
                        { value: "center", label: "Centre" },
                        { value: "right", label: "Right" },
                      ]}
                    />
                    <Labelled label="Overlay darkness (0–1)">
                      {({ id }) => (
                        <input id={id} type="number" min={0} max={1} step={0.05} className="field tnum" value={s.overlay} onChange={(e) => updateSlide(s.id, { overlay: Number(e.target.value) })} />
                      )}
                    </Labelled>
                    <ColourField label="Text colour" value={s.textColour} onChange={(v) => updateSlide(s.id, { textColour: v })} />
                    <Labelled label="Starts at">
                      {({ id }) => (
                        <input id={id} type="datetime-local" className="field" value={toLocalInput(s.startsAt)} onChange={(e) => updateSlide(s.id, { startsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                      )}
                    </Labelled>
                    <Labelled label="Ends at">
                      {({ id }) => (
                        <input id={id} type="datetime-local" className="field" value={toLocalInput(s.endsAt)} onChange={(e) => updateSlide(s.id, { endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                      )}
                    </Labelled>
                    <Toggle on={s.active} onChange={(v) => updateSlide(s.id, { active: v })} label="Active" />
                  </div>

                  <div className="space-y-3">
                    <p className="eyebrow">Desktop preview</p>
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[10px] bg-bg-subtle">
                      {url ? <img src={url} alt={s.alt} className="size-full object-cover" /> : <MediaThumb id={null} className="size-full" />}
                      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${s.overlay})` }} />
                      <div
                        className={`absolute inset-0 flex flex-col justify-center gap-2 p-6 ${
                          s.align === "center" ? "items-center text-center" : s.align === "right" ? "items-end text-right" : "items-start text-left"
                        }`}
                        style={{ color: s.textColour }}
                      >
                        {s.eyebrow ? <p className="text-[11px] tracking-[0.2em] uppercase">{s.eyebrow}</p> : null}
                        <p className="text-[24px] leading-tight font-semibold">
                          {s.titleLine1} {s.titleLine2}
                        </p>
                        {s.ctaLabel ? <span className="mt-1 rounded-[8px] bg-surface px-3 py-1 text-[12px] text-ink">{s.ctaLabel}</span> : null}
                      </div>
                    </div>
                    <p className="eyebrow">Mobile preview</p>
                    <div className="relative aspect-[9/16] w-full max-w-[180px] overflow-hidden rounded-[14px] bg-bg-subtle">
                      {url ? <img src={url} alt={s.alt} className="size-full object-cover" /> : <MediaThumb id={null} className="size-full" />}
                      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${s.overlay})` }} />
                      <div className="absolute inset-x-0 bottom-0 p-4" style={{ color: s.textColour }}>
                        <p className="text-[16px] leading-tight font-semibold">
                          {s.titleLine1} {s.titleLine2}
                        </p>
                      </div>
                    </div>
                  </div>
                </Grid>
              </Panel>
            );
          })}
        </div>
      )}

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} note="Unsaved hero slider changes." /> : null}
    </AdminShell>
  );
}
