import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
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
  TextField,
  Toggle,
  useDraft,
} from "@/components/velora/kit";
import { mutateContent, useAdminState, useCan } from "@/lib/velora/store";
import type { Announcement } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/content/announcements")({
  head: () => ({
    meta: [
      { title: "Announcement bar — Velora Admin" },
      { name: "description", content: "Rotating messages shown in the storefront announcement bar." },
      { property: "og:title", content: "Announcement bar — Velora Admin" },
      { property: "og:description", content: "Rotating messages shown in the storefront announcement bar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AnnouncementsScreen,
});

const icons = ["truck", "refresh", "shield", "cash"] as const;

function newAnnouncement(sort: number): Announcement {
  return {
    id: `a-${Date.now()}`,
    icon: "truck",
    label: "New announcement",
    href: "/",
    bg: "#1c1a18",
    fg: "#ffffff",
    speed: 30,
    dismissible: true,
    startsAt: null,
    endsAt: null,
    active: true,
    sort,
  };
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function AnnouncementsScreen() {
  const state = useAdminState();
  const can = useCan();
  const canWrite = can("content.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.content.announcements);

  const rows = [...draft].sort((a, b) => a.sort - b.sort);

  const save = () => {
    mutateContent(
      (d) => {
        d.content.announcements = draft;
      },
      { action: "content.announcements.update", entity: "Announcement bar", before: state.content.announcements, after: draft },
    );
    commit();
    toast.success("Announcement bar saved");
  };

  const update = (id: string, patch: Partial<Announcement>) => {
    setDraft((d) => d.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const remove = (id: string) => {
    setDraft((d) => d.filter((a) => a.id !== id));
  };

  const move = (id: string, dir: -1 | 1) => {
    setDraft((d) => {
      const sorted = [...d].sort((a, b) => a.sort - b.sort);
      const idx = sorted.findIndex((a) => a.id === id);
      const target = idx + dir;
      if (target < 0 || target >= sorted.length) return d;
      const a = sorted[idx]!;
      const b = sorted[target]!;
      const swap = a.sort;
      a.sort = b.sort;
      b.sort = swap;
      return sorted;
    });
  };

  const add = () => {
    const nextSort = rows.length ? Math.max(...rows.map((a) => a.sort)) + 1 : 0;
    setDraft((d) => [...d, newAnnouncement(nextSort)]);
  };

  return (
    <AdminShell trail={[{ label: "Content", to: "/admin/content/brand" }, { label: "Announcements" }]}>
      <PageHeader
        eyebrow="Content studio"
        title="Announcement bar"
        sub="The scrolling strip of messages shown above the header."
        actions={canWrite ? <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={add}>Add announcement</Button> : null}
      />

      {rows.length ? (
        <Panel title="Live preview" description="Only active, currently scheduled rows are shown, in sort order.">
          <div className="space-y-2">
            {rows
              .filter((a) => a.active)
              .map((a) => (
                <div
                  key={a.id}
                  className="overflow-hidden rounded-[10px] px-4 py-2 text-[12px]"
                  style={{ background: a.bg, color: a.fg }}
                >
                  <div className="no-scrollbar flex gap-8 overflow-x-auto whitespace-nowrap" style={{ animationDuration: `${a.speed}s` }}>
                    <span>{a.label}</span>
                    <span>{a.label}</span>
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      ) : null}

      {rows.length === 0 ? (
        <Panel>
          <EmptyState title="No announcements yet" body="Add a row to show a message in the storefront bar." action={canWrite ? <Button onClick={add}>Add announcement</Button> : undefined} />
        </Panel>
      ) : (
        <div className="space-y-4">
          {rows.map((a, i) => (
            <Panel
              key={a.id}
              title={a.label || "Untitled"}
              actions={
                canWrite ? (
                  <div className="flex gap-1">
                    <IconButton label="Move up" icon={<span aria-hidden>↑</span>} onClick={() => move(a.id, -1)} disabled={i === 0} />
                    <IconButton label="Move down" icon={<span aria-hidden>↓</span>} onClick={() => move(a.id, 1)} disabled={i === rows.length - 1} />
                    <IconButton label="Remove" icon={<Trash2 className="size-4" />} onClick={() => remove(a.id)} />
                  </div>
                ) : null
              }
            >
              <Grid cols={3}>
                <SelectField
                  label="Icon"
                  value={a.icon}
                  onChange={(e) => update(a.id, { icon: e.target.value as Announcement["icon"] })}
                  options={icons.map((i) => ({ value: i, label: i.charAt(0).toUpperCase() + i.slice(1) }))}
                />
                <TextField label="Label" value={a.label} onChange={(e) => update(a.id, { label: e.target.value })} />
                <TextField label="Link (href)" value={a.href} onChange={(e) => update(a.id, { href: e.target.value })} />
                <ColourField label="Background colour" value={a.bg} onChange={(v) => update(a.id, { bg: v })} />
                <ColourField label="Text colour" value={a.fg} onChange={(v) => update(a.id, { fg: v })} />
                <Labelled label="Scroll speed (seconds per loop)">
                  {({ id }) => (
                    <input id={id} type="number" min={5} className="field tnum" value={a.speed} onChange={(e) => update(a.id, { speed: Number(e.target.value) })} />
                  )}
                </Labelled>
                <Labelled label="Starts at">
                  {({ id }) => (
                    <input
                      id={id}
                      type="datetime-local"
                      className="field"
                      value={toLocalInput(a.startsAt)}
                      onChange={(e) => update(a.id, { startsAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    />
                  )}
                </Labelled>
                <Labelled label="Ends at">
                  {({ id }) => (
                    <input
                      id={id}
                      type="datetime-local"
                      className="field"
                      value={toLocalInput(a.endsAt)}
                      onChange={(e) => update(a.id, { endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    />
                  )}
                </Labelled>
                <div className="flex flex-col justify-end gap-2">
                  <Toggle on={a.dismissible} onChange={(v) => update(a.id, { dismissible: v })} label="Dismissible" />
                  <Toggle on={a.active} onChange={(v) => update(a.id, { active: v })} label="Active" />
                </div>
              </Grid>
            </Panel>
          ))}
        </div>
      )}

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} note="Unsaved announcement changes." /> : null}
    </AdminShell>
  );
}
