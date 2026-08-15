import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  IconButton,
  InlineBanner,
  Labelled,
  PageHeader,
  Panel,
  SaveBar,
  TextField,
  Toggle,
  useDraft,
} from "@/components/velora/kit";
import { mutateContent, useAdminState, useCan } from "@/lib/velora/store";
import type { LinkRow } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/content/header")({
  head: () => ({
    meta: [
      { title: "Header — Velora Admin" },
      { name: "description", content: "Home link, navigation tree and header utility toggles for the storefront." },
      { property: "og:title", content: "Header — Velora Admin" },
      { property: "og:description", content: "Home link, navigation tree and header utility toggles for the storefront." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HeaderScreen,
});

function knownPaths(state: ReturnType<typeof useAdminState>): Set<string> {
  const paths = new Set<string>(["/", "/shop", "/cart", "/wishlist", "/account", "/checkout"]);
  for (const c of state.categories) paths.add(`/category/${c.slug}`);
  for (const c of state.collections) paths.add(`/collection/${c.slug}`);
  for (const p of state.content.pages) paths.add(`/${p.slug}`);
  return paths;
}

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}

function flatten(rows: LinkRow[]): LinkRow[] {
  return rows.flatMap((r) => [r, ...(r.children ? flatten(r.children) : [])]);
}

function LinkRowEditor({
  rows,
  onChange,
  known,
  depth = 0,
}: {
  rows: LinkRow[];
  onChange: (rows: LinkRow[]) => void;
  known: Set<string>;
  depth?: number;
}) {
  const update = (i: number, patch: Partial<LinkRow>) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[i], next[target]] = [next[target]!, next[i]!];
    onChange(next);
  };
  const add = () => onChange([...rows, { label: "New link", href: "/" }]);

  return (
    <div className={depth > 0 ? "ml-6 space-y-3 border-l border-line pl-4" : "space-y-3"}>
      {rows.map((row, i) => {
        const unresolved = !isExternal(row.href) && row.href.trim() !== "" && !known.has(row.href.split("?")[0]!.split("#")[0]!);
        return (
          <div key={i} className="rounded-[10px] border border-line p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <TextField label="Label" value={row.label} onChange={(e) => update(i, { label: e.target.value })} />
              <TextField label="Link (href)" value={row.href} error={unresolved ? "No matching storefront page" : undefined} onChange={(e) => update(i, { href: e.target.value })} />
              <div className="flex items-end gap-1">
                <IconButton label="Move up" icon={<span aria-hidden>↑</span>} onClick={() => move(i, -1)} />
                <IconButton label="Move down" icon={<span aria-hidden>↓</span>} onClick={() => move(i, 1)} />
                <IconButton label="Remove link" icon={<Trash2 className="size-4" />} onClick={() => remove(i)} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <Toggle on={Boolean(row.newTab)} onChange={(v) => update(i, { newTab: v })} label="Open in new tab" />
              <Button
                size="sm"
                onClick={() => update(i, { children: [...(row.children ?? []), { label: "Sub link", href: "/" }] })}
              >
                Add sub-link
              </Button>
            </div>
            {row.children && row.children.length > 0 ? (
              <div className="mt-3">
                <LinkRowEditor
                  rows={row.children}
                  known={known}
                  depth={depth + 1}
                  onChange={(children) => update(i, { children })}
                />
              </div>
            ) : null}
          </div>
        );
      })}
      <Button size="sm" icon={<Plus className="size-3.5" />} onClick={add}>
        Add {depth > 0 ? "sub-link" : "nav item"}
      </Button>
    </div>
  );
}

function HeaderScreen() {
  const state = useAdminState();
  const can = useCan();
  const canWrite = can("content.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.content.header);
  const known = knownPaths(state);

  const brokenCount = flatten(draft.nav).filter(
    (r) => !isExternal(r.href) && r.href.trim() !== "" && !known.has(r.href.split("?")[0]!.split("#")[0]!),
  ).length;

  const save = () => {
    mutateContent(
      (d) => {
        d.content.header = draft;
      },
      { action: "content.header.update", entity: "Header", before: state.content.header, after: draft },
    );
    commit();
    toast.success("Header saved");
  };

  return (
    <AdminShell trail={[{ label: "Content", to: "/admin/content/brand" }, { label: "Header" }]}>
      <PageHeader eyebrow="Content studio" title="Header" sub="Home link, primary navigation and header utilities." />

      {brokenCount > 0 ? (
        <InlineBanner
          tone="warn"
          title={`${brokenCount} link${brokenCount === 1 ? "" : "s"} may point to a page that doesn't exist`}
          body="Check hrefs against your categories, collections and content pages."
        />
      ) : null}

      <Panel title="Home link">
        <TextField
          label="Home href"
          helper="Where the logo links to."
          value={draft.homeHref}
          onChange={(e) => setDraft((d) => ({ ...d, homeHref: e.target.value }))}
        />
      </Panel>

      <Panel title="Primary navigation" description="Reorder, nest and edit the header menu.">
        <LinkRowEditor rows={draft.nav} known={known} onChange={(nav) => setDraft((d) => ({ ...d, nav }))} />
      </Panel>

      <Panel title="Header utilities">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Toggle on={draft.showSearch} onChange={(v) => setDraft((d) => ({ ...d, showSearch: v }))} label="Show search" />
          <Toggle on={draft.showWishlist} onChange={(v) => setDraft((d) => ({ ...d, showWishlist: v }))} label="Show wishlist" />
          <Toggle on={draft.showAccount} onChange={(v) => setDraft((d) => ({ ...d, showAccount: v }))} label="Show account" />
          <Toggle on={draft.showCart} onChange={(v) => setDraft((d) => ({ ...d, showCart: v }))} label="Show cart" />
          <Toggle on={draft.showCurrency} onChange={(v) => setDraft((d) => ({ ...d, showCurrency: v }))} label="Show currency switcher" />
        </div>
      </Panel>

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} note="Unsaved header changes." /> : null}
    </AdminShell>
  );
}
