import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import { Button, Grid, IconButton, Panel, SaveBar, TextArea, TextField, useDraft } from "@/components/velora/kit";
import { mutateContent, useAdminState, useCan } from "@/lib/velora/store";

export const Route = createFileRoute("/admin/content/footer")({
  head: () => ({
    meta: [
      { title: "Footer — Velora Admin" },
      { name: "description", content: "Edit the storefront footer: about text, link columns, socials, payment badges and legal copy." },
      { property: "og:title", content: "Footer — Velora Admin" },
      { property: "og:description", content: "Edit the storefront footer content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FooterScreen,
});

function FooterScreen() {
  const state = useAdminState();
  const can = useCan();
  const editable = can("content.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.content);
  const [saving, setSaving] = useState(false);
  const [newBadge, setNewBadge] = useState("");
  const [newPayMethod, setNewPayMethod] = useState("");

  const save = () => {
    setSaving(true);
    mutateContent(
      (d) => {
        d.content.footerAbout = draft.footerAbout;
        d.content.footerColumns = draft.footerColumns;
        d.content.footerSocial = draft.footerSocial;
        d.content.paymentBadges = draft.paymentBadges;
        d.content.legal = draft.legal;
      },
      { action: "content.footer.update", entity: "content.footer" },
    );
    commit();
    setSaving(false);
    toast.success("Footer saved");
  };

  return (
    <AdminShell trail={[{ label: "Content", to: "/admin/content/promo" }, { label: "Footer" }]}>
      <div className="rise mb-6">
        <p className="eyebrow">Content studio</p>
        <h1 className="mt-1 text-[20px] font-semibold">Footer</h1>
        <p className="mt-1 max-w-[80ch] text-[13px] text-muted">About text, link columns, socials, payment badges and legal copy shown at the base of every page.</p>
      </div>

      <Grid cols={2}>
        <Panel title="About">
          <TextArea label="Footer about text" rows={5} value={draft.footerAbout} disabled={!editable} onChange={(e) => setDraft((d) => ({ ...d, footerAbout: e.target.value }))} />
        </Panel>

        <Panel title="Legal">
          <div className="space-y-4">
            <TextField
              label="Copyright"
              helper="Use {year} to insert the current year"
              value={draft.legal.copyright}
              disabled={!editable}
              onChange={(e) => setDraft((d) => ({ ...d, legal: { ...d.legal, copyright: e.target.value } }))}
            />
            <div>
              <p className="eyebrow mb-1.5">Payment methods (legal line)</p>
              <ul className="flex flex-wrap gap-2">
                {draft.legal.paymentMethods.map((m, i) => (
                  <li key={`${m}-${i}`} className="pill bg-bg-subtle text-ink">
                    {m}
                    {editable ? (
                      <button
                        type="button"
                        className="ml-1.5"
                        aria-label={`Remove ${m}`}
                        onClick={() => setDraft((d) => ({ ...d, legal: { ...d.legal, paymentMethods: d.legal.paymentMethods.filter((_, x) => x !== i) } }))}
                      >
                        ✕
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {editable ? (
                <div className="mt-2 flex gap-2">
                  <input className="field" placeholder="Add payment method" value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)} />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!newPayMethod.trim()) return;
                      setDraft((d) => ({ ...d, legal: { ...d.legal, paymentMethods: [...d.legal.paymentMethods, newPayMethod.trim()] } }));
                      setNewPayMethod("");
                    }}
                  >
                    Add
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </Panel>
      </Grid>

      <Panel
        title="Footer columns"
        description="Each column has a heading and a list of links."
        actions={
          editable ? (
            <Button
              size="sm"
              icon={<Plus className="size-3.5" />}
              onClick={() =>
                setDraft((d) => ({ ...d, footerColumns: [...d.footerColumns, { id: `fc-${Date.now()}`, heading: "New column", links: [] }] }))
              }
            >
              Add column
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {draft.footerColumns.map((col, ci) => (
            <div key={col.id} className="space-y-3 rounded-[12px] border border-line p-4">
              <div className="flex items-center gap-2">
                <TextField
                  label="Heading"
                  className="flex-1"
                  value={col.heading}
                  disabled={!editable}
                  onChange={(e) =>
                    setDraft((d) => {
                      const cols = structuredClone(d.footerColumns);
                      cols[ci]!.heading = e.target.value;
                      return { ...d, footerColumns: cols };
                    })
                  }
                />
                <div className="flex flex-col gap-1">
                  <IconButton
                    label="Move column left"
                    icon={<span aria-hidden>←</span>}
                    disabled={ci === 0 || !editable}
                    onClick={() =>
                      setDraft((d) => {
                        const cols = [...d.footerColumns];
                        [cols[ci - 1], cols[ci]] = [cols[ci]!, cols[ci - 1]!];
                        return { ...d, footerColumns: cols };
                      })
                    }
                  />
                  <IconButton
                    label="Move column right"
                    icon={<span aria-hidden>→</span>}
                    disabled={ci === draft.footerColumns.length - 1 || !editable}
                    onClick={() =>
                      setDraft((d) => {
                        const cols = [...d.footerColumns];
                        [cols[ci + 1], cols[ci]] = [cols[ci]!, cols[ci + 1]!];
                        return { ...d, footerColumns: cols };
                      })
                    }
                  />
                </div>
              </div>

              <ul className="space-y-2">
                {col.links.map((link, li) => (
                  <li key={li} className="space-y-1 rounded-[8px] border border-line p-2">
                    <div className="flex gap-2">
                      <input
                        className="field flex-1"
                        placeholder="Label"
                        value={link.label}
                        disabled={!editable}
                        onChange={(e) =>
                          setDraft((d) => {
                            const cols = structuredClone(d.footerColumns);
                            cols[ci]!.links[li]!.label = e.target.value;
                            return { ...d, footerColumns: cols };
                          })
                        }
                      />
                      <IconButton
                        label="Remove link"
                        icon={<Trash2 className="size-4" />}
                        onClick={() =>
                          setDraft((d) => {
                            const cols = structuredClone(d.footerColumns);
                            cols[ci]!.links = cols[ci]!.links.filter((_, x) => x !== li);
                            return { ...d, footerColumns: cols };
                          })
                        }
                      />
                    </div>
                    <input
                      className="field"
                      placeholder="/href"
                      value={link.href}
                      disabled={!editable}
                      onChange={(e) =>
                        setDraft((d) => {
                          const cols = structuredClone(d.footerColumns);
                          cols[ci]!.links[li]!.href = e.target.value;
                          return { ...d, footerColumns: cols };
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
              {editable ? (
                <Button
                  size="sm"
                  icon={<Plus className="size-3.5" />}
                  onClick={() =>
                    setDraft((d) => {
                      const cols = structuredClone(d.footerColumns);
                      cols[ci]!.links.push({ label: "New link", href: "/" });
                      return { ...d, footerColumns: cols };
                    })
                  }
                >
                  Add link
                </Button>
              ) : null}
              {editable ? (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="size-3.5" />}
                  onClick={() => setDraft((d) => ({ ...d, footerColumns: d.footerColumns.filter((c) => c.id !== col.id) }))}
                >
                  Remove column
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      <Grid cols={2}>
        <Panel
          title="Social links"
          actions={
            editable ? (
              <Button
                size="sm"
                icon={<Plus className="size-3.5" />}
                onClick={() => setDraft((d) => ({ ...d, footerSocial: [...d.footerSocial, { platform: "Instagram", url: "" }] }))}
              >
                Add
              </Button>
            ) : undefined
          }
        >
          <ul className="space-y-2">
            {draft.footerSocial.map((s, i) => (
              <li key={i} className="flex gap-2">
                <input
                  className="field w-32 shrink-0"
                  placeholder="Platform"
                  value={s.platform}
                  disabled={!editable}
                  onChange={(e) =>
                    setDraft((d) => {
                      const next = structuredClone(d.footerSocial);
                      next[i]!.platform = e.target.value;
                      return { ...d, footerSocial: next };
                    })
                  }
                />
                <input
                  className="field flex-1"
                  placeholder="https://…"
                  value={s.url}
                  disabled={!editable}
                  onChange={(e) =>
                    setDraft((d) => {
                      const next = structuredClone(d.footerSocial);
                      next[i]!.url = e.target.value;
                      return { ...d, footerSocial: next };
                    })
                  }
                />
                {editable ? (
                  <IconButton
                    label="Remove social link"
                    icon={<Trash2 className="size-4" />}
                    onClick={() => setDraft((d) => ({ ...d, footerSocial: d.footerSocial.filter((_, x) => x !== i) }))}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Payment badges">
          <ul className="flex flex-wrap gap-2">
            {draft.paymentBadges.map((b, i) => (
              <li key={`${b}-${i}`} className="pill bg-bg-subtle text-ink">
                {b}
                {editable ? (
                  <button
                    type="button"
                    className="ml-1.5"
                    aria-label={`Remove ${b}`}
                    onClick={() => setDraft((d) => ({ ...d, paymentBadges: d.paymentBadges.filter((_, x) => x !== i) }))}
                  >
                    ✕
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {editable ? (
            <div className="mt-2 flex gap-2">
              <input className="field" placeholder="Add payment badge" value={newBadge} onChange={(e) => setNewBadge(e.target.value)} />
              <Button
                size="sm"
                onClick={() => {
                  if (!newBadge.trim()) return;
                  setDraft((d) => ({ ...d, paymentBadges: [...d.paymentBadges, newBadge.trim()] }));
                  setNewBadge("");
                }}
              >
                Add
              </Button>
            </div>
          ) : null}
        </Panel>
      </Grid>

      <Panel title="Live preview">
        <div className="rounded-[14px] border border-line bg-ink p-6 text-surface">
          <div className="grid gap-6 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <p className="text-[13px] opacity-80">{draft.footerAbout}</p>
              <div className="mt-3 flex gap-2">
                {draft.footerSocial.map((s, i) => (
                  <span key={i} className="pill bg-surface/10 text-surface">
                    {s.platform}
                  </span>
                ))}
              </div>
            </div>
            {draft.footerColumns.map((c) => (
              <div key={c.id}>
                <p className="text-[12px] font-semibold tracking-[0.1em] uppercase opacity-70">{c.heading}</p>
                <ul className="mt-2 space-y-1">
                  {c.links.map((l, i) => (
                    <li key={i} className="text-[13px] opacity-90">
                      {l.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-surface/20 pt-4 text-[12px] opacity-70">
            <span>{draft.legal.copyright.replace("{year}", String(new Date().getFullYear()))}</span>
            <span>{draft.legal.paymentMethods.join(" · ")}</span>
          </div>
        </div>
      </Panel>

      {editable ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} saving={saving} /> : null}
    </AdminShell>
  );
}
