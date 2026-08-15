import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  Grid,
  IconButton,
  Labelled,
  PageHeader,
  Panel,
  SaveBar,
  SelectField,
  TextField,
  Toggle,
  useDraft,
} from "@/components/velora/kit";
import { SingleImageField } from "@/components/velora/MediaPicker";
import { mutateContent, useAdminState, useCan } from "@/lib/velora/store";
import type { CategoryTile, Content, FeatureRow, HomeSection } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/content/home")({
  head: () => ({
    meta: [
      { title: "Homepage composition — Velora Admin" },
      { name: "description", content: "Section order, feature strip, category tiles and new-arrivals rail." },
      { property: "og:title", content: "Homepage composition — Velora Admin" },
      { property: "og:description", content: "Section order, feature strip, category tiles and new-arrivals rail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HomeScreen,
});

function toLocalInput(iso: string | null): string {
  return iso ? iso.slice(0, 16) : "";
}

type Draft = { sections: HomeSection[]; features: FeatureRow[]; categorySection: Content["categorySection"]; arrivalsSection: Content["arrivalsSection"] };

function HomeScreen() {
  const state = useAdminState();
  const can = useCan();
  const canWrite = can("content.write");
  const source: Draft = {
    sections: state.content.sections,
    features: state.content.features,
    categorySection: state.content.categorySection,
    arrivalsSection: state.content.arrivalsSection,
  };
  const { draft, setDraft, dirty, reset, commit } = useDraft(source);

  const save = () => {
    mutateContent(
      (d) => {
        d.content.sections = draft.sections;
        d.content.features = draft.features;
        d.content.categorySection = draft.categorySection;
        d.content.arrivalsSection = draft.arrivalsSection;
      },
      { action: "content.home.update", entity: "Homepage composition", before: source, after: draft },
    );
    commit();
    toast.success("Homepage composition saved");
  };

  const sections = [...draft.sections].sort((a, b) => a.sort - b.sort);
  const moveSection = (key: HomeSection["key"], dir: -1 | 1) =>
    setDraft((d) => {
      const sorted = [...d.sections].sort((a, b) => a.sort - b.sort);
      const idx = sorted.findIndex((s) => s.key === key);
      const target = idx + dir;
      if (target < 0 || target >= sorted.length) return d;
      const a = sorted[idx]!;
      const b = sorted[target]!;
      const swap = a.sort;
      a.sort = b.sort;
      b.sort = swap;
      return { ...d, sections: sorted };
    });
  const updateSection = (key: HomeSection["key"], patch: Partial<HomeSection>) =>
    setDraft((d) => ({ ...d, sections: d.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));

  const features = [...draft.features].sort((a, b) => a.sort - b.sort);
  const updateFeature = (id: string, patch: Partial<FeatureRow>) =>
    setDraft((d) => ({ ...d, features: d.features.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
  const removeFeature = (id: string) => setDraft((d) => ({ ...d, features: d.features.filter((f) => f.id !== id) }));
  const addFeature = () => {
    const maxSort = Math.max(-1, ...draft.features.map((f) => f.sort));
    setDraft((d) => ({
      ...d,
      features: [...d.features, { id: `f-${Date.now()}`, icon: "truck", title: "New feature", body: "", sort: maxSort + 1, active: true }],
    }));
  };

  const tiles = [...draft.categorySection.tiles].sort((a, b) => a.sort - b.sort);
  const updateTile = (id: string, patch: Partial<CategoryTile>) =>
    setDraft((d) => ({ ...d, categorySection: { ...d.categorySection, tiles: d.categorySection.tiles.map((t) => (t.id === id ? { ...t, ...patch } : t)) } }));
  const removeTile = (id: string) => setDraft((d) => ({ ...d, categorySection: { ...d.categorySection, tiles: d.categorySection.tiles.filter((t) => t.id !== id) } }));
  const addTile = () => {
    const maxSort = Math.max(-1, ...draft.categorySection.tiles.map((t) => t.sort));
    setDraft((d) => ({
      ...d,
      categorySection: {
        ...d.categorySection,
        tiles: [...d.categorySection.tiles, { id: `t-${Date.now()}`, name: "New tile", ctaLabel: "Shop now", href: "/shop", imageId: null, alt: "", sort: maxSort + 1, active: true }],
      },
    }));
  };

  return (
    <AdminShell trail={[{ label: "Content", to: "/admin/content/brand" }, { label: "Homepage" }]}>
      <PageHeader eyebrow="Content studio" title="Homepage composition" sub="Order, visibility and scheduling of every homepage section." />

      <Panel title="Sections" description="Reorder and schedule when each section shows.">
        <div className="space-y-2">
          {sections.map((s, i) => (
            <div key={s.key} className="grid grid-cols-1 items-center gap-3 rounded-[10px] border border-line p-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <p className="text-[13px] font-medium">{s.label}</p>
              <Labelled label="Starts at">
                {({ id }) => (
                  <input id={id} type="datetime-local" className="field" value={toLocalInput(s.startsAt)} onChange={(e) => updateSection(s.key, { startsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                )}
              </Labelled>
              <Labelled label="Ends at">
                {({ id }) => (
                  <input id={id} type="datetime-local" className="field" value={toLocalInput(s.endsAt)} onChange={(e) => updateSection(s.key, { endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                )}
              </Labelled>
              <div className="flex items-center gap-2">
                <Toggle on={s.visible} onChange={(v) => updateSection(s.key, { visible: v })} label="Visible" />
                <IconButton label="Move up" icon={<span aria-hidden>↑</span>} onClick={() => moveSection(s.key, -1)} disabled={i === 0} />
                <IconButton label="Move down" icon={<span aria-hidden>↓</span>} onClick={() => moveSection(s.key, 1)} disabled={i === sections.length - 1} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Feature strip" actions={canWrite ? <Button size="sm" icon={<Plus className="size-3.5" />} onClick={addFeature}>Add feature</Button> : null}>
        <div className="space-y-3">
          {features.map((f) => (
            <div key={f.id} className="grid grid-cols-1 gap-3 rounded-[10px] border border-line p-3 sm:grid-cols-[140px_1fr_1fr_auto_auto]">
              <SelectField
                label="Icon"
                value={f.icon}
                onChange={(e) => updateFeature(f.id, { icon: e.target.value as FeatureRow["icon"] })}
                options={["truck", "refresh", "shield", "headset"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))}
              />
              <TextField label="Title" value={f.title} onChange={(e) => updateFeature(f.id, { title: e.target.value })} />
              <TextField label="Body" value={f.body} onChange={(e) => updateFeature(f.id, { body: e.target.value })} />
              <Toggle on={f.active} onChange={(v) => updateFeature(f.id, { active: v })} label="Active" />
              <div className="flex items-end">
                <IconButton label="Remove feature" icon={<Trash2 className="size-4" />} onClick={() => removeFeature(f.id)} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Category section">
        <Grid cols={3}>
          <TextField label="Title" value={draft.categorySection.title} onChange={(e) => setDraft((d) => ({ ...d, categorySection: { ...d.categorySection, title: e.target.value } }))} />
          <TextField label="View all label" value={draft.categorySection.viewAllLabel} onChange={(e) => setDraft((d) => ({ ...d, categorySection: { ...d.categorySection, viewAllLabel: e.target.value } }))} />
          <TextField label="View all link" value={draft.categorySection.viewAllHref} onChange={(e) => setDraft((d) => ({ ...d, categorySection: { ...d.categorySection, viewAllHref: e.target.value } }))} />
        </Grid>
        <div className="mt-4 flex items-center justify-between">
          <p className="eyebrow">Tiles</p>
          {canWrite ? <Button size="sm" icon={<Plus className="size-3.5" />} onClick={addTile}>Add tile</Button> : null}
        </div>
        <div className="mt-2 space-y-3">
          {tiles.map((t) => (
            <div key={t.id} className="rounded-[10px] border border-line p-3">
              <Grid cols={3}>
                <TextField label="Name" value={t.name} onChange={(e) => updateTile(t.id, { name: e.target.value })} />
                <TextField label="CTA label" value={t.ctaLabel} onChange={(e) => updateTile(t.id, { ctaLabel: e.target.value })} />
                <TextField label="Link" value={t.href} onChange={(e) => updateTile(t.id, { href: e.target.value })} />
                <SingleImageField label="Image" value={t.imageId} onChange={(v) => updateTile(t.id, { imageId: v })} />
                <TextField label="Alt text" value={t.alt} onChange={(e) => updateTile(t.id, { alt: e.target.value })} />
                <Labelled label="Sort">
                  {({ id }) => (
                    <input id={id} type="number" className="field tnum" value={t.sort} onChange={(e) => updateTile(t.id, { sort: Number(e.target.value) })} />
                  )}
                </Labelled>
              </Grid>
              <div className="mt-2 flex items-center justify-between">
                <Toggle on={t.active} onChange={(v) => updateTile(t.id, { active: v })} label="Active" />
                <IconButton label="Remove tile" icon={<Trash2 className="size-4" />} onClick={() => removeTile(t.id)} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="New arrivals rail">
        <Grid cols={2}>
          <TextField label="Title" value={draft.arrivalsSection.title} onChange={(e) => setDraft((d) => ({ ...d, arrivalsSection: { ...d.arrivalsSection, title: e.target.value } }))} />
          <TextField label="View all label" value={draft.arrivalsSection.viewAllLabel} onChange={(e) => setDraft((d) => ({ ...d, arrivalsSection: { ...d.arrivalsSection, viewAllLabel: e.target.value } }))} />
          <TextField label="View all link" value={draft.arrivalsSection.viewAllHref} onChange={(e) => setDraft((d) => ({ ...d, arrivalsSection: { ...d.arrivalsSection, viewAllHref: e.target.value } }))} />
          <SelectField
            label="Selection mode"
            value={draft.arrivalsSection.mode}
            onChange={(e) => setDraft((d) => ({ ...d, arrivalsSection: { ...d.arrivalsSection, mode: e.target.value as Content["arrivalsSection"]["mode"] } }))}
            options={[
              { value: "manual", label: "Manual selection" },
              { value: "collection", label: "Collection" },
              { value: "newest", label: "Newest" },
              { value: "bestselling", label: "Bestselling" },
            ]}
          />
          {draft.arrivalsSection.mode === "collection" ? (
            <SelectField
              label="Collection"
              value={draft.arrivalsSection.collection}
              onChange={(e) => setDraft((d) => ({ ...d, arrivalsSection: { ...d.arrivalsSection, collection: e.target.value } }))}
              options={state.collections.map((c) => ({ value: c.name, label: c.name }))}
            />
          ) : (
            <Labelled label="Count">
              {({ id }) => (
                <input id={id} type="number" min={1} className="field tnum" value={draft.arrivalsSection.count} onChange={(e) => setDraft((d) => ({ ...d, arrivalsSection: { ...d.arrivalsSection, count: Number(e.target.value) } }))} />
              )}
            </Labelled>
          )}
        </Grid>
        {draft.arrivalsSection.mode === "manual" ? (
          <div className="mt-4">
            <p className="eyebrow mb-2">Manually selected products</p>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-[10px] border border-line p-2">
              {state.products.map((p) => {
                const checked = draft.arrivalsSection.manualIds.includes(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px] hover:bg-bg-subtle">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          arrivalsSection: {
                            ...d.arrivalsSection,
                            manualIds: e.target.checked
                              ? [...d.arrivalsSection.manualIds, p.id]
                              : d.arrivalsSection.manualIds.filter((id) => id !== p.id),
                          },
                        }))
                      }
                    />
                    {p.name}
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </Panel>

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} note="Unsaved homepage changes." /> : null}
    </AdminShell>
  );
}
