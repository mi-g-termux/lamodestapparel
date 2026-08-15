import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  ColourField,
  ErrorState,
  Grid,
  IconButton,
  Labelled,
  MoneyField,
  PageHeader,
  Panel,
  RichText,
  SaveBar,
  SelectField,
  SlugField,
  Tabs,
  TextArea,
  TextField,
  Toggle,
  useDraft,
} from "@/components/velora/kit";
import { GalleryField, MediaThumb, SingleImageField } from "@/components/velora/MediaPicker";
import { mutate, useAdminState, useCan, useCurrency } from "@/lib/velora/store";
import { formatMoney, toMinor } from "@/lib/velora/money";
import { productStatuses } from "@/lib/velora/status";
import type { DetailRow, OptionValue, Product, ProductOption, Variant } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/products/$id")({
  head: () => ({
    meta: [
      { title: "Edit product — Velora Admin" },
      { name: "description", content: "Edit product content, pricing, variants, inventory, SEO and related items." },
      { property: "og:title", content: "Edit product — Velora Admin" },
      { property: "og:description", content: "Edit a Velora catalogue product." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProductEditor,
});

const TABS = [
  { value: "basics", label: "Basics" },
  { value: "media", label: "Media" },
  { value: "pricing", label: "Pricing" },
  { value: "variants", label: "Options & variants" },
  { value: "inventory", label: "Inventory" },
  { value: "social", label: "Social proof" },
  { value: "seo", label: "SEO" },
  { value: "related", label: "Related" },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ProductEditor() {
  const { id } = useParams({ from: "/admin/products/$id" });
  const state = useAdminState();
  const currency = useCurrency();
  const can = useCan();
  const navigate = useNavigate();
  const source = state.products.find((p) => p.id === id);
  const { draft, setDraft, dirty, reset, commit } = useDraft(source ?? ({} as Product));
  const [tab, setTab] = useState("basics");
  const [saving, setSaving] = useState(false);

  if (!source) {
    return (
      <AdminShell trail={[{ label: "Products", to: "/admin/products" }, { label: "Not found" }]}>
        <ErrorState message="This product no longer exists." />
      </AdminShell>
    );
  }

  const set = <K extends keyof Product>(key: K, value: Product[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const slugTaken = state.products.some((p) => p.id !== id && p.slug === draft.slug);
  const priceInvalid = draft.price < 0 || (draft.compareAt !== null && draft.compareAt < 0) || draft.cost < 0;
  const stockInvalid = draft.variants.some((v) => v.stock < 0 || v.lowStock < 0);
  const canSave = !slugTaken && !priceInvalid && !stockInvalid && draft.name.trim().length > 0;

  const save = () => {
    if (!canSave) {
      toast.error("Fix validation errors before saving");
      return;
    }
    setSaving(true);
    mutate(
      (d) => {
        const idx = d.products.findIndex((p) => p.id === id);
        if (idx >= 0) d.products[idx] = draft;
      },
      { action: "product.update", entity: draft.name, before: source, after: draft },
    );
    commit();
    setSaving(false);
    toast.success("Product saved");
  };

  const margin = draft.price > 0 ? ((draft.price - draft.cost) / draft.price) * 100 : 0;

  const addDetail = () => set("details", [...draft.details, { title: "New detail", body: "" }]);
  const updateDetail = (i: number, patch: Partial<DetailRow>) =>
    set("details", draft.details.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const removeDetail = (i: number) => set("details", draft.details.filter((_, idx) => idx !== i));
  const moveDetail = (i: number, dir: -1 | 1) => {
    const next = [...draft.details];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t]!, next[i]!];
    set("details", next);
  };

  const addOption = () => set("options", [...draft.options, { name: "New option", values: [] }]);
  const updateOption = (i: number, patch: Partial<ProductOption>) =>
    set("options", draft.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const removeOption = (i: number) => set("options", draft.options.filter((_, idx) => idx !== i));
  const addOptionValue = (i: number) =>
    updateOption(i, { values: [...draft.options[i]!.values, { value: "New value" }] });
  const updateOptionValue = (i: number, vi: number, patch: Partial<OptionValue>) =>
    updateOption(i, { values: draft.options[i]!.values.map((v, idx) => (idx === vi ? { ...v, ...patch } : v)) });
  const removeOptionValue = (i: number, vi: number) =>
    updateOption(i, { values: draft.options[i]!.values.filter((_, idx) => idx !== vi) });
  const isColourOption = (name: string) => name.trim().toLowerCase() === "colour" || name.trim().toLowerCase() === "color";

  const generateVariants = () => {
    if (draft.options.length === 0) return;
    const combos: Record<string, string>[] = [{}];
    for (const opt of draft.options) {
      const next: Record<string, string>[] = [];
      for (const combo of combos) {
        for (const v of opt.values) next.push({ ...combo, [opt.name]: v.value });
      }
      combos.length = 0;
      combos.push(...next);
    }
    const existing = new Map(draft.variants.map((v) => [JSON.stringify(v.options), v]));
    const variants: Variant[] = combos.map((options, i) => {
      const found = existing.get(JSON.stringify(options));
      if (found) return found;
      return {
        id: `${draft.id}-v${Date.now()}-${i}`,
        options,
        sku: `${draft.slug.toUpperCase()}-${Object.values(options).join("-").toUpperCase()}`,
        barcode: "",
        price: draft.price,
        compareAt: draft.compareAt,
        cost: draft.cost,
        stock: 0,
        lowStock: draft.lowStock,
        weightG: draft.weightG,
        imageId: draft.primaryImageId,
        active: true,
      };
    });
    set("variants", variants);
    toast.success(`Generated ${variants.length} variants`);
  };

  const updateVariant = (vid: string, patch: Partial<Variant>) =>
    set("variants", draft.variants.map((v) => (v.id === vid ? { ...v, ...patch } : v)));
  const removeVariant = (vid: string) => set("variants", draft.variants.filter((v) => v.id !== vid));

  const reviews = state.reviews.filter((r) => r.productId === id);

  return (
    <AdminShell trail={[{ label: "Products", to: "/admin/products" }, { label: draft.name || "Untitled" }]}>
      <PageHeader
        eyebrow="Product"
        title={draft.name || "Untitled product"}
        sub={`/${draft.slug || draft.id}`}
        tabs={<Tabs items={TABS} value={tab} onChange={setTab} />}
      />

      {tab === "basics" && (
        <div className="space-y-4">
          <Panel title="Basics">
            <Grid cols={2}>
              <TextField label="Name" required value={draft.name} onChange={(e) => set("name", e.target.value)} />
              <SlugField
                label="Slug"
                source={draft.name}
                value={draft.slug}
                onChange={(v) => set("slug", v)}
              />
              <SelectField
                label="Status"
                value={draft.status}
                onChange={(e) => set("status", e.target.value as Product["status"])}
                options={productStatuses.map((s) => ({ value: s, label: s }))}
              />
              <Labelled label="Publish at">
                {({ id: fid }) => (
                  <input
                    id={fid}
                    type="datetime-local"
                    className="field"
                    value={draft.publishAt ? draft.publishAt.slice(0, 16) : ""}
                    onChange={(e) => set("publishAt", new Date(e.target.value).toISOString())}
                  />
                )}
              </Labelled>
              <SelectField
                label="Category"
                value={draft.category}
                onChange={(e) => set("category", e.target.value)}
                options={state.categories.map((c) => ({ value: c.name, label: c.name }))}
              />
              <SelectField
                label="Collection"
                value={draft.collection}
                onChange={(e) => set("collection", e.target.value)}
                options={state.collections.map((c) => ({ value: c.name, label: c.name }))}
              />
              <TextField label="Brand" value={draft.brand} onChange={(e) => set("brand", e.target.value)} />
              <TextField label="Badge" value={draft.badge} onChange={(e) => set("badge", e.target.value)} helper="Shown as a small tag on product cards" />
              <TextField
                label="Tags"
                value={draft.tags.join(", ")}
                onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
                helper="Comma separated"
              />
            </Grid>
            {slugTaken ? <p className="mt-2 text-[12px] text-bad">This slug is already used by another product.</p> : null}
            <div className="mt-4">
              <TextArea label="Short description" rows={2} value={draft.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
            </div>
            <div className="mt-4">
              <RichText label="Long description" value={draft.longDescription} onChange={(v) => set("longDescription", v)} />
            </div>
          </Panel>

          <Panel
            title="Details accordion"
            description="Shown as expandable rows on the product page."
            actions={<Button size="sm" icon={<Plus className="size-3.5" />} onClick={addDetail}>Add row</Button>}
          >
            {draft.details.length === 0 ? (
              <p className="text-[13px] text-muted">No detail rows yet.</p>
            ) : (
              <ul className="space-y-3">
                {draft.details.map((d, i) => (
                  <li key={i} className="rounded-[10px] border border-line p-3">
                    <div className="flex items-center gap-2">
                      <TextField label="Title" className="flex-1" value={d.title} onChange={(e) => updateDetail(i, { title: e.target.value })} />
                      <div className="flex shrink-0 gap-1 pt-5">
                        <IconButton label="Move up" icon={<span aria-hidden>↑</span>} onClick={() => moveDetail(i, -1)} />
                        <IconButton label="Move down" icon={<span aria-hidden>↓</span>} onClick={() => moveDetail(i, 1)} />
                        <IconButton label="Remove row" icon={<Trash2 className="size-4" />} onClick={() => removeDetail(i)} />
                      </div>
                    </div>
                    <TextArea label="Body" className="mt-2" rows={2} value={d.body} onChange={(e) => updateDetail(i, { body: e.target.value })} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === "media" && (
        <div className="space-y-4">
          <Panel title="Primary image">
            <SingleImageField label="Primary image" value={draft.primaryImageId} onChange={(v) => set("primaryImageId", v)} />
          </Panel>
          <Panel title="Gallery">
            <GalleryField
              label="Gallery"
              ids={draft.galleryIds}
              onChange={(ids) => set("galleryIds", ids)}
              primaryId={draft.primaryImageId}
              onPrimary={(pid) => set("primaryImageId", pid)}
            />
          </Panel>
          <Panel title="Gallery by colour" description="Pick images per colour swatch so choosing a colour on the storefront swaps the gallery.">
            {(draft.options.find((o) => isColourOption(o.name))?.values ?? []).length === 0 ? (
              <p className="text-[13px] text-muted">Add a Colour option under Options & variants first.</p>
            ) : (
              <div className="space-y-4">
                {draft.options
                  .filter((o) => isColourOption(o.name))
                  .flatMap((o) => o.values)
                  .map((v) => (
                    <div key={v.value} className="rounded-[10px] border border-line p-3">
                      <p className="mb-2 text-[13px] font-medium">{v.value}</p>
                      <GalleryField
                        label={`${v.value} images`}
                        ids={draft.galleryByColour[v.value] ?? []}
                        onChange={(ids) => set("galleryByColour", { ...draft.galleryByColour, [v.value]: ids })}
                      />
                    </div>
                  ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === "pricing" && (
        <Panel title="Pricing">
          <Grid cols={2}>
            <MoneyField label="Price" valueMinor={draft.price} onChangeMinor={(m) => set("price", m)} currency={currency} />
            <MoneyField
              label="Compare-at price"
              valueMinor={draft.compareAt ?? 0}
              onChangeMinor={(m) => set("compareAt", m || null)}
              currency={currency}
              helper="Set to 0 to remove"
            />
            <MoneyField label="Cost" valueMinor={draft.cost} onChangeMinor={(m) => set("cost", m)} currency={currency} />
            <TextField label="Tax class" value={draft.taxClass} onChange={(e) => set("taxClass", e.target.value)} />
          </Grid>
          {priceInvalid ? <p className="mt-2 text-[12px] text-bad">Money fields cannot be negative.</p> : null}
          <div className="mt-4 rounded-[10px] border border-line bg-bg-subtle p-3">
            <p className="text-[12px] text-muted">Live margin</p>
            <p className="tnum text-[20px] font-semibold">{margin.toFixed(1)}%</p>
            <p className="text-[12px] text-muted">
              {formatMoney(draft.price - draft.cost, currency)} profit at {formatMoney(draft.price, currency)} sale price
            </p>
          </div>
        </Panel>
      )}

      {tab === "variants" && (
        <div className="space-y-4">
          <Panel
            title="Options"
            actions={<Button size="sm" icon={<Plus className="size-3.5" />} onClick={addOption}>Add option</Button>}
          >
            {draft.options.length === 0 ? (
              <p className="text-[13px] text-muted">No options yet — add Size or Colour to build a variant matrix.</p>
            ) : (
              <ul className="space-y-4">
                {draft.options.map((opt, i) => (
                  <li key={i} className="rounded-[10px] border border-line p-3">
                    <div className="flex items-center gap-2">
                      <TextField label="Option name" className="flex-1" value={opt.name} onChange={(e) => updateOption(i, { name: e.target.value })} />
                      <IconButton label="Remove option" className="mt-5" icon={<Trash2 className="size-4" />} onClick={() => removeOption(i)} />
                    </div>
                    <div className="mt-3 space-y-2">
                      {opt.values.map((v, vi) => (
                        <div key={vi} className="flex items-center gap-2">
                          <TextField label="Value" className="flex-1" value={v.value} onChange={(e) => updateOptionValue(i, vi, { value: e.target.value })} />
                          {isColourOption(opt.name) ? (
                            <ColourField label="Hex" value={v.hex ?? "#000000"} onChange={(hex) => updateOptionValue(i, vi, { hex })} />
                          ) : null}
                          <IconButton label="Remove value" className="mt-5" icon={<Trash2 className="size-4" />} onClick={() => removeOptionValue(i, vi)} />
                        </div>
                      ))}
                      <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => addOptionValue(i)}>
                        Add value
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button className="mt-4" variant="primary" onClick={generateVariants} disabled={draft.options.length === 0}>
              Generate variant matrix
            </Button>
          </Panel>

          <Panel title="Variants" description={`${draft.variants.length} variant(s)`}>
            {draft.variants.length === 0 ? (
              <p className="text-[13px] text-muted">No variants yet.</p>
            ) : (
              <div className="space-y-3">
                {draft.variants.map((v) => (
                  <div key={v.id} className="rounded-[10px] border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-medium">{Object.values(v.options).join(" · ") || "Default"}</p>
                      <div className="flex items-center gap-2">
                        <Toggle on={v.active} onChange={(on) => updateVariant(v.id, { active: on })} label="Active" />
                        <IconButton label="Remove variant" icon={<Trash2 className="size-4" />} onClick={() => removeVariant(v.id)} />
                      </div>
                    </div>
                    <Grid cols={4} className="mt-3">
                      <TextField label="SKU" value={v.sku} onChange={(e) => updateVariant(v.id, { sku: e.target.value })} />
                      <TextField label="Barcode" value={v.barcode} onChange={(e) => updateVariant(v.id, { barcode: e.target.value })} />
                      <MoneyField label="Price" valueMinor={v.price} onChangeMinor={(m) => updateVariant(v.id, { price: m })} currency={currency} />
                      <MoneyField label="Compare-at" valueMinor={v.compareAt ?? 0} onChangeMinor={(m) => updateVariant(v.id, { compareAt: m || null })} currency={currency} />
                      <MoneyField label="Cost" valueMinor={v.cost} onChangeMinor={(m) => updateVariant(v.id, { cost: m })} currency={currency} />
                      <TextField
                        label="Stock"
                        type="number"
                        value={v.stock}
                        error={v.stock < 0 ? "Cannot be negative" : undefined}
                        onChange={(e) => updateVariant(v.id, { stock: Number(e.target.value) })}
                      />
                      <TextField
                        label="Low stock"
                        type="number"
                        value={v.lowStock}
                        error={v.lowStock < 0 ? "Cannot be negative" : undefined}
                        onChange={(e) => updateVariant(v.id, { lowStock: Number(e.target.value) })}
                      />
                      <TextField label="Weight (g)" type="number" value={v.weightG} onChange={(e) => updateVariant(v.id, { weightG: Number(e.target.value) })} />
                    </Grid>
                    <div className="mt-3">
                      <SingleImageField label="Variant image" value={v.imageId} onChange={(id) => updateVariant(v.id, { imageId: id })} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === "inventory" && (
        <Panel title="Inventory">
          <Grid cols={2}>
            <Toggle on={draft.trackInventory} onChange={(v) => set("trackInventory", v)} label="Track inventory" />
            <SelectField
              label="Backorder policy"
              value={draft.backorder}
              onChange={(e) => set("backorder", e.target.value as Product["backorder"])}
              options={[
                { value: "deny", label: "Deny — block sale when out of stock" },
                { value: "allow", label: "Allow — sell through" },
                { value: "notify", label: "Notify — waitlist customer" },
              ]}
            />
            <TextField label="Low stock threshold" type="number" value={draft.lowStock} onChange={(e) => set("lowStock", Number(e.target.value))} />
            <TextField label="Incoming stock" type="number" value={draft.incoming} onChange={(e) => set("incoming", Number(e.target.value))} />
            <TextField label="Weight (g)" type="number" value={draft.weightG} onChange={(e) => set("weightG", Number(e.target.value))} />
            <Toggle on={draft.shipsAlone} onChange={(v) => set("shipsAlone", v)} label="Ships alone" description="Cannot be combined with other items in one parcel" />
          </Grid>
          <div className="mt-4">
            <p className="eyebrow mb-2">Dimensions (cm)</p>
            <Grid cols={3}>
              <TextField label="Length" type="number" value={draft.dimensionsCm.l} onChange={(e) => set("dimensionsCm", { ...draft.dimensionsCm, l: Number(e.target.value) })} />
              <TextField label="Width" type="number" value={draft.dimensionsCm.w} onChange={(e) => set("dimensionsCm", { ...draft.dimensionsCm, w: Number(e.target.value) })} />
              <TextField label="Height" type="number" value={draft.dimensionsCm.h} onChange={(e) => set("dimensionsCm", { ...draft.dimensionsCm, h: Number(e.target.value) })} />
            </Grid>
          </div>
        </Panel>
      )}

      {tab === "social" && (
        <div className="space-y-4">
          <Panel title="Rating overrides">
            <Grid cols={2}>
              <TextField
                label="Rating override"
                type="number"
                step="0.1"
                min={0}
                max={5}
                value={draft.ratingOverride ?? ""}
                onChange={(e) => set("ratingOverride", e.target.value === "" ? null : Number(e.target.value))}
                helper="Leave blank to use real review average"
              />
              <TextField
                label="Review count override"
                type="number"
                value={draft.reviewCountOverride ?? ""}
                onChange={(e) => set("reviewCountOverride", e.target.value === "" ? null : Number(e.target.value))}
              />
            </Grid>
          </Panel>
          <Panel title="Reviews" description={`${reviews.length} review(s) for this product`}>
            {reviews.length === 0 ? (
              <p className="text-[13px] text-muted">No reviews yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {reviews.map((r) => (
                  <li key={r.id} className="py-2 first:pt-0">
                    <p className="text-[13px] font-medium">{r.author} · {r.rating}★ · {r.state}</p>
                    <p className="text-[13px]">{r.title}</p>
                    <p className="text-[12px] text-muted">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === "seo" && (
        <Panel title="SEO">
          <Grid cols={2}>
            <TextField label="Title" value={draft.seo.title} onChange={(e) => set("seo", { ...draft.seo, title: e.target.value })} />
            <TextField label="Canonical URL" value={draft.seo.canonical} onChange={(e) => set("seo", { ...draft.seo, canonical: e.target.value })} />
          </Grid>
          <div className="mt-4">
            <TextArea label="Description" value={draft.seo.description} onChange={(e) => set("seo", { ...draft.seo, description: e.target.value })} />
          </div>
          <div className="mt-4">
            <SingleImageField label="OG image" value={draft.seo.ogImageId} onChange={(id) => set("seo", { ...draft.seo, ogImageId: id })} />
          </div>
          <div className="mt-4">
            <Toggle on={draft.seo.index} onChange={(v) => set("seo", { ...draft.seo, index: v })} label="Indexable" description="Allow search engines to index this page" />
          </div>
          <div className="mt-4 rounded-[10px] border border-line p-3">
            <p className="eyebrow mb-2">Search result preview</p>
            <p className="truncate text-[16px] text-info">{draft.seo.title || draft.name}</p>
            <p className="truncate text-[12px] text-ok">{draft.seo.canonical || `/product/${draft.slug}`}</p>
            <p className="text-[13px] text-muted">{draft.seo.description || draft.shortDescription}</p>
          </div>
        </Panel>
      )}

      {tab === "related" && (
        <Panel title="Related products">
          <SelectField
            label="Mode"
            value={draft.relatedMode}
            onChange={(e) => set("relatedMode", e.target.value as Product["relatedMode"])}
            options={[
              { value: "manual", label: "Manual selection" },
              { value: "collection", label: "Same collection" },
            ]}
          />
          {draft.relatedMode === "manual" ? (
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {state.products
                .filter((p) => p.id !== id)
                .map((p) => {
                  const active = draft.relatedIds.includes(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          set(
                            "relatedIds",
                            active ? draft.relatedIds.filter((r) => r !== p.id) : [...draft.relatedIds, p.id],
                          )
                        }
                        className={`flex w-full items-center gap-2 rounded-[10px] border p-2 text-left ${
                          active ? "border-gold" : "border-line"
                        }`}
                      >
                        <MediaThumb id={p.primaryImageId} className="size-10 shrink-0" />
                        <span className="truncate text-[13px]">{p.name}</span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] text-muted">
              Related items are pulled automatically from the “{draft.collection}” collection.
            </p>
          )}
        </Panel>
      )}

      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={reset} note={!canSave && dirty ? "Fix validation errors before saving." : undefined} />
    </AdminShell>
  );
}
