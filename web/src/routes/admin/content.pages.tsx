import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  ConfirmDialog,
  Grid,
  IconButton,
  InlineBanner,
  Panel,
  RichText,
  SaveBar,
  SelectField,
  SlugField,
  TextField,
  Toggle,
  useDraft,
} from "@/components/velora/kit";
import { SingleImageField } from "@/components/velora/MediaPicker";
import { mutateContent, useAdminState, useCan } from "@/lib/velora/store";
import type { ContentPage } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/content/pages")({
  head: () => ({
    meta: [
      { title: "Pages — Velora Admin" },
      { name: "description", content: "Manage the storefront's static pages, FAQ and size guide." },
      { property: "og:title", content: "Pages — Velora Admin" },
      { property: "og:description", content: "Manage the storefront's static pages, FAQ and size guide." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PagesScreen,
});

function newPage(sort: number): ContentPage {
  return {
    id: `pg-${Date.now()}`,
    title: "New page",
    slug: "new-page",
    body: "<p>Page content</p>",
    heroImageId: null,
    status: "Draft",
    publishAt: new Date().toISOString(),
    sort,
    showInFooter: false,
    showInNav: false,
    seo: { title: "", description: "", ogImageId: null, canonical: "", index: true },
  };
}

function PagesScreen() {
  const state = useAdminState();
  const can = useCan();
  const editable = can("content.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.content.pages);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(state.content.pages[0]?.id ?? null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const save = () => {
    setSaving(true);
    mutateContent((d) => (d.content.pages = draft), { action: "content.pages.update", entity: "content.pages" });
    commit();
    setSaving(false);
    toast.success("Pages saved");
  };

  const page = draft.find((p) => p.id === selectedId) ?? null;
  const update = (id: string, fn: (p: ContentPage) => void) => {
    setDraft((d) => {
      const next = structuredClone(d);
      const p = next.find((x) => x.id === id);
      if (p) fn(p);
      return next;
    });
  };

  const linkedFrom = (slug: string) => {
    const href = `/${slug}`;
    const footer = state.content.footerColumns.some((c) => c.links.some((l) => l.href === href));
    const nav = state.content.header.nav.some((l) => l.href === href || l.children?.some((c) => c.href === href));
    return { footer, nav };
  };

  const faqGrouped = page?.faq
    ? Object.entries(
        page.faq.reduce<Record<string, typeof page.faq>>((acc, f) => {
          (acc[f.category] ??= []).push(f);
          return acc;
        }, {}),
      )
    : [];

  return (
    <AdminShell trail={[{ label: "Content", to: "/admin/content/promo" }, { label: "Pages" }]}>
      <div className="rise mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Content studio</p>
          <h1 className="mt-1 text-[20px] font-semibold">Pages</h1>
          <p className="mt-1 max-w-[80ch] text-[13px] text-muted">Static storefront pages including About, FAQ, size guide, shipping, privacy, terms and contact.</p>
        </div>
        {editable ? (
          <Button
            icon={<Plus className="size-3.5" />}
            onClick={() => {
              const p = newPage(draft.length);
              setDraft((d) => [...d, p]);
              setSelectedId(p.id);
            }}
          >
            New page
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Panel title="All pages" padded={false}>
          <ul className="divide-y divide-line">
            {draft.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`block w-full px-4 py-3 text-left transition-colors ${selectedId === p.id ? "bg-cream" : "hover:bg-bg-subtle"}`}
                >
                  <p className="truncate text-[13px] font-medium">{p.title}</p>
                  <p className="truncate text-[12px] text-muted">/{p.slug} · {p.status}</p>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        {page ? (
          <div className="space-y-4">
            {(() => {
              const links = linkedFrom(page.slug);
              return links.footer || links.nav ? (
                <InlineBanner
                  tone="info"
                  title="This page is linked"
                  body={`Referenced from ${[links.footer && "the footer", links.nav && "the header nav"].filter(Boolean).join(" and ")}. Deleting it will leave a broken link.`}
                />
              ) : null;
            })()}

            <Panel title="Page details">
              <div className="space-y-4">
                <Grid cols={2}>
                  <TextField label="Title" value={page.title} disabled={!editable} onChange={(e) => update(page.id, (p) => (p.title = e.target.value))} />
                  <SlugField label="Slug" source={page.title} value={page.slug} onChange={(v) => update(page.id, (p) => (p.slug = v))} />
                </Grid>
                <RichText label="Body" value={page.body} onChange={(v) => update(page.id, (p) => (p.body = v))} />
                <SingleImageField label="Hero image" value={page.heroImageId} onChange={(id) => update(page.id, (p) => (p.heroImageId = id))} />
                <Grid cols={3}>
                  <SelectField
                    label="Status"
                    value={page.status}
                    options={[{ value: "Draft", label: "Draft" }, { value: "Published", label: "Published" }]}
                    onChange={(e) => update(page.id, (p) => (p.status = e.target.value as ContentPage["status"]))}
                  />
                  <TextField
                    label="Publish at"
                    type="datetime-local"
                    value={page.publishAt.slice(0, 16)}
                    disabled={!editable}
                    onChange={(e) => update(page.id, (p) => (p.publishAt = new Date(e.target.value).toISOString()))}
                  />
                  <TextField
                    label="Sort"
                    type="number"
                    value={page.sort}
                    disabled={!editable}
                    onChange={(e) => update(page.id, (p) => (p.sort = Number(e.target.value) || 0))}
                  />
                </Grid>
                <Grid cols={2}>
                  <Toggle on={page.showInFooter} onChange={(v) => update(page.id, (p) => (p.showInFooter = v))} label="Show in footer" disabled={!editable} />
                  <Toggle on={page.showInNav} onChange={(v) => update(page.id, (p) => (p.showInNav = v))} label="Show in header nav" disabled={!editable} />
                </Grid>
              </div>
            </Panel>

            <Panel title="SEO">
              <div className="space-y-4">
                <TextField label="Meta title" value={page.seo.title} disabled={!editable} onChange={(e) => update(page.id, (p) => (p.seo.title = e.target.value))} />
                <TextField label="Meta description" value={page.seo.description} disabled={!editable} onChange={(e) => update(page.id, (p) => (p.seo.description = e.target.value))} />
                <Grid cols={2}>
                  <TextField label="Canonical" value={page.seo.canonical} disabled={!editable} onChange={(e) => update(page.id, (p) => (p.seo.canonical = e.target.value))} />
                  <Toggle on={page.seo.index} onChange={(v) => update(page.id, (p) => (p.seo.index = v))} label="Indexable" disabled={!editable} />
                </Grid>
              </div>
            </Panel>

            <Panel
              title="FAQ"
              description="Grouped by category, in list order."
              actions={
                editable ? (
                  <Button
                    size="sm"
                    icon={<Plus className="size-3.5" />}
                    onClick={() => update(page.id, (p) => (p.faq = [...(p.faq ?? []), { id: `q-${Date.now()}`, category: "General", q: "", a: "" }]))}
                  >
                    Add question
                  </Button>
                ) : undefined
              }
            >
              {faqGrouped.length === 0 ? (
                <p className="text-[13px] text-muted">No FAQ entries on this page.</p>
              ) : (
                <div className="space-y-6">
                  {faqGrouped.map(([category, items]) => (
                    <div key={category}>
                      <p className="eyebrow mb-2">{category}</p>
                      <ul className="space-y-3">
                        {items.map((f) => (
                          <li key={f.id} className="space-y-2 rounded-[10px] border border-line p-3">
                            <div className="flex gap-2">
                              <input
                                className="field w-40 shrink-0"
                                placeholder="Category"
                                value={f.category}
                                disabled={!editable}
                                onChange={(e) =>
                                  update(page.id, (p) => {
                                    const item = p.faq!.find((x) => x.id === f.id)!;
                                    item.category = e.target.value;
                                  })
                                }
                              />
                              <input
                                className="field flex-1"
                                placeholder="Question"
                                value={f.q}
                                disabled={!editable}
                                onChange={(e) =>
                                  update(page.id, (p) => {
                                    const item = p.faq!.find((x) => x.id === f.id)!;
                                    item.q = e.target.value;
                                  })
                                }
                              />
                              {editable ? (
                                <IconButton
                                  label="Remove question"
                                  icon={<Trash2 className="size-4" />}
                                  onClick={() => update(page.id, (p) => (p.faq = p.faq!.filter((x) => x.id !== f.id)))}
                                />
                              ) : null}
                            </div>
                            <textarea
                              className="field resize-y"
                              rows={2}
                              placeholder="Answer"
                              value={f.a}
                              disabled={!editable}
                              onChange={(e) =>
                                update(page.id, (p) => {
                                  const item = p.faq!.find((x) => x.id === f.id)!;
                                  item.a = e.target.value;
                                })
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              {!page.faq && editable ? (
                <Button size="sm" className="mt-3" onClick={() => update(page.id, (p) => (p.faq = []))}>
                  Enable FAQ on this page
                </Button>
              ) : null}
            </Panel>

            <Panel
              title="Size guide"
              description="Editable columns and rows with a unit note."
              actions={
                editable && page.sizeGuide ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        update(page.id, (p) => {
                          p.sizeGuide!.columns.push(`Column ${p.sizeGuide!.columns.length + 1}`);
                          p.sizeGuide!.rows.forEach((r) => r.push(""));
                        })
                      }
                    >
                      Add column
                    </Button>
                    <Button
                      size="sm"
                      icon={<Plus className="size-3.5" />}
                      onClick={() =>
                        update(page.id, (p) => {
                          p.sizeGuide!.rows.push(p.sizeGuide!.columns.map(() => ""));
                        })
                      }
                    >
                      Add row
                    </Button>
                  </div>
                ) : undefined
              }
            >
              {page.sizeGuide ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[13px]">
                    <thead>
                      <tr>
                        {page.sizeGuide.columns.map((c, ci) => (
                          <th key={ci} className="border-b border-line px-2 py-2">
                            <div className="flex items-center gap-1">
                              <input
                                className="field"
                                value={c}
                                disabled={!editable}
                                onChange={(e) =>
                                  update(page.id, (p) => {
                                    p.sizeGuide!.columns[ci] = e.target.value;
                                  })
                                }
                              />
                              {editable ? (
                                <IconButton
                                  label="Remove column"
                                  icon={<Trash2 className="size-4" />}
                                  onClick={() =>
                                    update(page.id, (p) => {
                                      p.sizeGuide!.columns = p.sizeGuide!.columns.filter((_, x) => x !== ci);
                                      p.sizeGuide!.rows = p.sizeGuide!.rows.map((r) => r.filter((_, x) => x !== ci));
                                    })
                                  }
                                />
                              ) : null}
                            </div>
                          </th>
                        ))}
                        <th className="border-b border-line px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {page.sizeGuide.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="border-b border-line px-2 py-1.5">
                              <input
                                className="field"
                                value={cell}
                                disabled={!editable}
                                onChange={(e) =>
                                  update(page.id, (p) => {
                                    p.sizeGuide!.rows[ri]![ci] = e.target.value;
                                  })
                                }
                              />
                            </td>
                          ))}
                          <td className="border-b border-line px-2 py-1.5">
                            {editable ? (
                              <IconButton
                                label="Remove row"
                                icon={<Trash2 className="size-4" />}
                                onClick={() => update(page.id, (p) => (p.sizeGuide!.rows = p.sizeGuide!.rows.filter((_, x) => x !== ri)))}
                              />
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[13px] text-muted">No size guide table on this page.</p>
              )}
              {!page.sizeGuide && editable ? (
                <Button size="sm" className="mt-3" onClick={() => update(page.id, (p) => (p.sizeGuide = { columns: ["Size"], rows: [["S"]] }))}>
                  Enable size guide on this page
                </Button>
              ) : null}
            </Panel>

            {editable ? (
              <Button variant="danger" icon={<Trash2 className="size-3.5" />} onClick={() => setConfirmDelete(page.id)}>
                Delete page
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-[13px] text-muted">Select a page to edit it.</p>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete page"
        body="This page will be removed once you save changes. Any footer or nav links pointing to it will break."
        destructive
        confirmLabel="Delete"
        onConfirm={() => {
          setDraft((d) => d.filter((p) => p.id !== confirmDelete));
          if (selectedId === confirmDelete) setSelectedId(null);
        }}
      />

      {editable ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} saving={saving} /> : null}
    </AdminShell>
  );
}
