import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/velora/AdminShell";
import { Column, DataTable } from "@/components/velora/DataTable";
import {
  Button,
  ConfirmDialog,
  PageHeader,
  SelectField,
  Sheet,
  StatusPill,
  formatDate,
} from "@/components/velora/kit";
import { MediaThumb } from "@/components/velora/MediaPicker";
import { mutate, productRating, productStock, useAdminState, useCan, useCurrency } from "@/lib/velora/store";
import { productStatuses, productTone, type ProductStatus } from "@/lib/velora/status";
import { formatMoney } from "@/lib/velora/money";
import type { Product } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [
      { title: "Products — Velora Admin" },
      { name: "description", content: "Manage the Velora product catalogue: pricing, stock, status and content." },
      { property: "og:title", content: "Products — Velora Admin" },
      { property: "og:description", content: "Manage the Velora product catalogue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProductsScreen,
});

function stockState(p: Product): "in" | "low" | "out" {
  const stock = productStock(p);
  if (stock <= 0) return "out";
  if (stock <= p.lowStock) return "low";
  return "in";
}

function ProductsScreen() {
  const state = useAdminState();
  const currency = useCurrency();
  const can = useCan();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [collection, setCollection] = useState("");
  const [tag, setTag] = useState("");
  const [stock, setStock] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "updated", dir: "desc" });
  const [confirmDelete, setConfirmDelete] = useState<Product[] | null>(null);
  const [confirmCategory, setConfirmCategory] = useState<Product[] | null>(null);
  const [bulkCategory, setBulkCategory] = useState("");

  const allTags = useMemo(() => Array.from(new Set(state.products.flatMap((p) => p.tags))).sort(), [state.products]);

  const filtered = useMemo(() => {
    return state.products.filter((p) => {
      if (query && !`${p.name} ${p.slug} ${p.brand}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (status && p.status !== status) return false;
      if (category && p.category !== category) return false;
      if (collection && p.collection !== collection) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (stock && stockState(p) !== stock) return false;
      return true;
    });
  }, [state.products, query, status, category, collection, tag, stock]);

  const columns: Column<Product>[] = [
    {
      key: "image",
      header: "",
      width: "56px",
      render: (p) => <MediaThumb id={p.primaryImageId} className="size-10 shrink-0" />,
    },
    {
      key: "name",
      header: "Product",
      value: (p) => p.name,
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">{p.name}</p>
          <p className="truncate text-[12px] text-muted">/{p.slug}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      value: (p) => p.status,
      render: (p) => <StatusPill tone={productTone[p.status]}>{p.status}</StatusPill>,
    },
    { key: "category", header: "Category", value: (p) => p.category, render: (p) => p.category },
    { key: "collection", header: "Collection", value: (p) => p.collection, render: (p) => p.collection, hideBelow: "md" },
    {
      key: "price",
      header: "Price",
      align: "right",
      value: (p) => p.price,
      render: (p) => formatMoney(p.price, currency),
    },
    {
      key: "compareAt",
      header: "Compare-at",
      align: "right",
      value: (p) => p.compareAt ?? 0,
      hideBelow: "lg",
      render: (p) => (p.compareAt ? formatMoney(p.compareAt, currency) : "—"),
    },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      value: (p) => productStock(p),
      render: (p) => {
        const s = stockState(p);
        return (
          <span className={s === "out" ? "text-bad" : s === "low" ? "text-warn" : undefined}>
            {productStock(p)}
          </span>
        );
      },
    },
    {
      key: "rating",
      header: "Rating",
      align: "right",
      value: (p) => productRating(state, p).rating,
      hideBelow: "lg",
      render: (p) => {
        const r = productRating(state, p);
        return r.count > 0 ? `${r.rating.toFixed(1)} (${r.count})` : "—";
      },
    },
    {
      key: "updated",
      header: "Updated",
      value: (p) => p.publishAt,
      hideBelow: "md",
      render: (p) => formatDate(p.publishAt),
    },
  ];

  const setStatusFor = (rows: Product[], next: ProductStatus) => {
    mutate(
      (draft) => {
        for (const r of rows) {
          const p = draft.products.find((x) => x.id === r.id);
          if (p) p.status = next;
        }
      },
      { action: "product.status.update", entity: rows.map((r) => r.name).join(", "), after: { status: next } },
    );
  };

  const createDraft = () => {
    const id = `p-${Date.now()}`;
    const newProduct: Product = {
      id,
      name: "New product",
      slug: id,
      status: "Draft",
      publishAt: new Date().toISOString(),
      category: state.categories[0]?.name ?? "",
      collection: state.collections[0]?.name ?? "",
      brand: "Velora",
      tags: [],
      badge: "",
      shortDescription: "",
      longDescription: "",
      details: [],
      primaryImageId: null,
      galleryIds: [],
      galleryByColour: {},
      price: 0,
      compareAt: null,
      cost: 0,
      taxClass: "Standard",
      options: [],
      variants: [],
      trackInventory: true,
      backorder: "deny",
      lowStock: 5,
      incoming: 0,
      weightG: 0,
      dimensionsCm: { l: 0, w: 0, h: 0 },
      shipsAlone: false,
      ratingOverride: null,
      reviewCountOverride: null,
      seo: { title: "", description: "", ogImageId: null, canonical: "", index: true },
      relatedIds: [],
      relatedMode: "manual",
    };
    mutate(
      (draft) => {
        draft.products = [newProduct, ...draft.products];
      },
      { action: "product.create", entity: newProduct.name, after: { id } },
    );
    navigate({ to: "/admin/products/$id", params: { id } });
  };

  return (
    <AdminShell trail={[{ label: "Products" }]}>
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        sub="Every product the storefront can show, including draft and scheduled items."
        actions={
          can("product.create") ? (
            <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={createDraft}>
              New product
            </Button>
          ) : null
        }
      />

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(p) => p.id}
        caption="Products"
        csvName="products"
        search={{ value: query, onChange: setQuery, placeholder: "Search name, slug, brand" }}
        sort={sort}
        onSort={setSort}
        page={page}
        pageSize={20}
        onPage={setPage}
        onRowClick={(p) => navigate({ to: "/admin/products/$id", params: { id: p.id } })}
        emptyTitle="No products match"
        emptyBody="Try clearing filters or search."
        filters={
          <>
            <SelectField
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[{ value: "", label: "All statuses" }, ...productStatuses.map((s) => ({ value: s, label: s }))]}
            />
            <SelectField
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[{ value: "", label: "All categories" }, ...state.categories.map((c) => ({ value: c.name, label: c.name }))]}
            />
            <SelectField
              label="Collection"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              options={[{ value: "", label: "All collections" }, ...state.collections.map((c) => ({ value: c.name, label: c.name }))]}
            />
            <SelectField
              label="Tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              options={[{ value: "", label: "All tags" }, ...allTags.map((t) => ({ value: t, label: t }))]}
            />
            <SelectField
              label="Stock"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              options={[
                { value: "", label: "All stock" },
                { value: "in", label: "In stock" },
                { value: "low", label: "Low stock" },
                { value: "out", label: "Out of stock" },
              ]}
            />
          </>
        }
        chips={[
          ...(status ? [{ label: `Status: ${status}`, onClear: () => setStatus("") }] : []),
          ...(category ? [{ label: `Category: ${category}`, onClear: () => setCategory("") }] : []),
          ...(collection ? [{ label: `Collection: ${collection}`, onClear: () => setCollection("") }] : []),
          ...(tag ? [{ label: `Tag: ${tag}`, onClear: () => setTag("") }] : []),
          ...(stock ? [{ label: `Stock: ${stock}`, onClear: () => setStock("") }] : []),
        ]}
        bulkActions={
          can("product.update")
            ? (rows, clear) => (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      setStatusFor(rows, "Active");
                      clear();
                    }}
                  >
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setStatusFor(rows, "Draft");
                      clear();
                    }}
                  >
                    Draft
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setStatusFor(rows, "Archived");
                      clear();
                    }}
                  >
                    Archive
                  </Button>
                  <Button size="sm" onClick={() => setConfirmCategory(rows)}>
                    Set category
                  </Button>
                  {can("product.delete") ? (
                    <Button size="sm" variant="danger" onClick={() => setConfirmDelete(rows)}>
                      Delete
                    </Button>
                  ) : null}
                </>
              )
            : undefined
        }
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete products"
        body={`This will permanently delete ${confirmDelete?.length ?? 0} product(s). This cannot be undone.`}
        destructive
        typedConfirm="DELETE"
        confirmLabel="Delete"
        onConfirm={() => {
          if (!confirmDelete) return;
          const ids = new Set(confirmDelete.map((p) => p.id));
          mutate(
            (draft) => {
              draft.products = draft.products.filter((p) => !ids.has(p.id));
            },
            { action: "product.delete", entity: confirmDelete.map((p) => p.name).join(", ") },
          );
        }}
      />

      <Sheet
        open={Boolean(confirmCategory)}
        onOpenChange={(v) => !v && setConfirmCategory(null)}
        title="Set category"
        description={`Choose a category for ${confirmCategory?.length ?? 0} product(s).`}
        footer={
          <>
            <Button onClick={() => setConfirmCategory(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!bulkCategory}
              onClick={() => {
                if (!confirmCategory || !bulkCategory) return;
                const ids = new Set(confirmCategory.map((p) => p.id));
                mutate(
                  (draft) => {
                    for (const p of draft.products) if (ids.has(p.id)) p.category = bulkCategory;
                  },
                  { action: "product.category.update", entity: confirmCategory.map((p) => p.name).join(", "), after: { category: bulkCategory } },
                );
                setConfirmCategory(null);
              }}
            >
              Apply
            </Button>
          </>
        }
      >
        <SelectField
          label="Category"
          value={bulkCategory}
          onChange={(e) => setBulkCategory(e.target.value)}
          options={[{ value: "", label: "Choose a category" }, ...state.categories.map((c) => ({ value: c.name, label: c.name }))]}
        />
      </Sheet>
    </AdminShell>
  );
}
