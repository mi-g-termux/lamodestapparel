import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button, ConfirmDialog, Grid, MoneyField, PageHeader, SelectField, Sheet, StatusPill, TextField, Toggle, formatDate,
} from "@/components/velora/kit";
import { Column, DataTable } from "@/components/velora/DataTable";
import { mutate, useAdminState, useCan, useCurrency } from "@/lib/velora/store";
import { formatMoney } from "@/lib/velora/money";
import type { Discount } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/discounts")({
  head: () => ({
    meta: [
      { title: "Discount codes — Velora Admin" },
      { name: "description", content: "Create and manage discount codes and track their real performance." },
      { property: "og:title", content: "Discount codes — Velora Admin" },
      { property: "og:description", content: "Create and manage discount codes and track their real performance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DiscountsScreen,
});

function blankDiscount(): Discount {
  return {
    id: `d-${Date.now()}`, code: "", type: "Percent", value: 10,
    appliesTo: { products: [], categories: [], collections: [] },
    excludes: { products: [], categories: [] },
    minSpendMinor: 0, maxDiscountMinor: null,
    startsAt: new Date().toISOString(), endsAt: null,
    totalLimit: null, perCustomerLimit: null, firstOrderOnly: false, combinable: false, autoApply: false,
    uses: 0, revenueMinor: 0, discountGivenMinor: 0, active: true,
  };
}

function DiscountsScreen() {
  const state = useAdminState();
  const currency = useCurrency();
  const can = useCan();
  const [editing, setEditing] = useState<Discount | null>(null);
  const [deleting, setDeleting] = useState<Discount | null>(null);
  const [error, setError] = useState<string | undefined>();

  const columns: Column<Discount>[] = [
    { key: "code", header: "Code", value: (r) => r.code, render: (r) => <span className="font-mono text-[13px]">{r.code}</span> },
    { key: "type", header: "Type", value: (r) => r.type, render: (r) => r.type },
    { key: "value", header: "Value", align: "right", value: (r) => r.value, render: (r) => (r.type === "Percent" ? `${r.value}%` : r.type === "Fixed" ? formatMoney(r.value, currency) : "—") },
    { key: "uses", header: "Uses", align: "right", value: (r) => r.uses, render: (r) => r.uses },
    { key: "revenue", header: "Revenue driven", align: "right", value: (r) => r.revenueMinor, render: (r) => formatMoney(r.revenueMinor, currency) },
    { key: "given", header: "Discount given", align: "right", value: (r) => r.discountGivenMinor, render: (r) => formatMoney(r.discountGivenMinor, currency) },
    {
      key: "window",
      header: "Schedule",
      value: (r) => r.startsAt,
      render: (r) => (
        <span className="text-[12px] text-muted">
          {formatDate(r.startsAt)} – {r.endsAt ? formatDate(r.endsAt) : "ongoing"}
        </span>
      ),
      hideBelow: "md",
    },
    { key: "active", header: "Status", value: (r) => String(r.active), render: (r) => <StatusPill tone={r.active ? "green" : "grey"}>{r.active ? "Active" : "Disabled"}</StatusPill> },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        can("marketing.write") ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setEditing(r)}>Edit</Button>
            <Button
              size="sm"
              onClick={() =>
                mutate((d) => { d.discounts.find((x) => x.id === r.id)!.active = !r.active; }, { action: "discount.status.update", entity: r.code })
              }
            >
              {r.active ? "Disable" : "Enable"}
            </Button>
            <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} onClick={() => setDeleting(r)}>Delete</Button>
          </div>
        ) : null,
    },
  ];

  const save = () => {
    if (!editing) return;
    const code = editing.code.trim().toUpperCase();
    if (!code) { setError("Enter a discount code."); return; }
    const dupe = state.discounts.some((d) => d.code.toUpperCase() === code && d.id !== editing.id);
    if (dupe) { setError("That code already exists — choose a unique code."); return; }
    const exists = state.discounts.some((d) => d.id === editing.id);
    mutate(
      (d) => {
        if (exists) Object.assign(d.discounts.find((x) => x.id === editing.id)!, { ...editing, code });
        else d.discounts = [{ ...editing, code }, ...d.discounts];
      },
      { action: exists ? "discount.update" : "discount.create", entity: code },
    );
    setEditing(null);
    setError(undefined);
    toast.success("Discount saved");
  };

  const listNames = (ids: string[], kind: "products" | "categories" | "collections") =>
    kind === "products" ? state.products.filter((p) => ids.includes(p.id)) : kind === "categories" ? state.categories.filter((c) => ids.includes(c.id)) : state.collections.filter((c) => ids.includes(c.id));

  return (
    <AdminShell trail={[{ label: "Discounts" }]}>
      <PageHeader
        eyebrow="Marketing"
        title="Discount codes"
        sub="Every code shown here tracks real uses, revenue driven and discount given."
        actions={can("marketing.write") ? <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setEditing(blankDiscount())}>New discount</Button> : undefined}
      />
      <DataTable rows={state.discounts} columns={columns} rowKey={(r) => r.id} caption="Discount codes" csvName="velora-discounts" cardTitle={(r) => r.code} emptyTitle="No discount codes yet" />

      <Sheet
        open={editing !== null}
        onOpenChange={(v) => { if (!v) { setEditing(null); setError(undefined); } }}
        title={editing && state.discounts.some((d) => d.id === editing.id) ? "Edit discount" : "New discount"}
        wide
        footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save discount</Button></>}
      >
        {editing ? (
          <div className="space-y-4">
            <Grid cols={2}>
              <TextField label="Code" value={editing.code} error={error} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} />
              <SelectField label="Type" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as Discount["type"] })} options={[{ value: "Percent", label: "Percent" }, { value: "Fixed", label: "Fixed" }, { value: "Free shipping", label: "Free shipping" }, { value: "Buy X get Y", label: "Buy X get Y" }]} />
            </Grid>
            {editing.type === "Percent" || editing.type === "Fixed" ? (
              <Grid cols={2}>
                {editing.type === "Percent" ? (
                  <TextField label="Percent off" type="number" value={String(editing.value)} onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })} />
                ) : (
                  <MoneyField label="Amount off" valueMinor={editing.value} onChangeMinor={(m) => setEditing({ ...editing, value: m })} currency={currency} />
                )}
                <MoneyField label="Maximum discount" valueMinor={editing.maxDiscountMinor ?? 0} onChangeMinor={(m) => setEditing({ ...editing, maxDiscountMinor: m || null })} currency={currency} helper="Leave at 0 for no cap." />
              </Grid>
            ) : null}
            <Grid cols={2}>
              <MoneyField label="Minimum spend" valueMinor={editing.minSpendMinor} onChangeMinor={(m) => setEditing({ ...editing, minSpendMinor: m })} currency={currency} />
              <TextField label="Total use limit" type="number" value={editing.totalLimit === null ? "" : String(editing.totalLimit)} placeholder="Unlimited" onChange={(e) => setEditing({ ...editing, totalLimit: e.target.value ? Number(e.target.value) : null })} />
              <TextField label="Per-customer limit" type="number" value={editing.perCustomerLimit === null ? "" : String(editing.perCustomerLimit)} placeholder="Unlimited" onChange={(e) => setEditing({ ...editing, perCustomerLimit: e.target.value ? Number(e.target.value) : null })} />
              <TextField label="Starts at" type="date" value={editing.startsAt.slice(0, 10)} onChange={(e) => setEditing({ ...editing, startsAt: new Date(e.target.value).toISOString() })} />
              <TextField label="Ends at" type="date" value={editing.endsAt ? editing.endsAt.slice(0, 10) : ""} onChange={(e) => setEditing({ ...editing, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </Grid>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label="First order only" on={editing.firstOrderOnly} onChange={(v) => setEditing({ ...editing, firstOrderOnly: v })} />
              <Toggle label="Combinable with other offers" on={editing.combinable} onChange={(v) => setEditing({ ...editing, combinable: v })} />
              <Toggle label="Auto-apply at checkout" on={editing.autoApply} onChange={(v) => setEditing({ ...editing, autoApply: v })} />
              <Toggle label="Active" on={editing.active} onChange={(v) => setEditing({ ...editing, active: v })} />
            </div>
            <div className="space-y-3">
              <p className="eyebrow">Applies to (leave empty for all products)</p>
              <Grid cols={2}>
                <Picker label="Categories" all={state.categories} selected={editing.appliesTo.categories} onChange={(ids) => setEditing({ ...editing, appliesTo: { ...editing.appliesTo, categories: ids } })} />
                <Picker label="Collections" all={state.collections} selected={editing.appliesTo.collections} onChange={(ids) => setEditing({ ...editing, appliesTo: { ...editing.appliesTo, collections: ids } })} />
              </Grid>
            </div>
            <div className="space-y-3">
              <p className="eyebrow">Excludes</p>
              <Picker label="Excluded categories" all={state.categories} selected={editing.excludes.categories} onChange={(ids) => setEditing({ ...editing, excludes: { ...editing.excludes, categories: ids } })} />
            </div>
          </div>
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Delete this discount?"
        body="This code will stop working immediately for shoppers."
        destructive
        confirmLabel="Delete discount"
        onConfirm={() => {
          if (!deleting) return;
          mutate((d) => { d.discounts = d.discounts.filter((x) => x.id !== deleting.id); }, { action: "discount.delete", entity: deleting.code });
        }}
      />
    </AdminShell>
  );
}

function Picker({ label, all, selected, onChange }: { label: string; all: { id: string; name: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{label}</p>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-[10px] border border-line p-2">
        {all.map((item) => (
          <label key={item.id} className="flex items-center gap-2 rounded-[6px] px-1.5 py-1 text-[13px] hover:bg-cream">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => onChange(selected.includes(item.id) ? selected.filter((x) => x !== item.id) : [...selected, item.id])}
            />
            {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}
