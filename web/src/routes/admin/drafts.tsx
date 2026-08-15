import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/velora/AdminShell";
import { Button, IconButton, Money, PageHeader, Panel, SelectField, Sheet, StatusPill, TextField, formatDateTime } from "@/components/velora/kit";
import { Column, DataTable } from "@/components/velora/DataTable";
import { mutate, nextOrderNumber, useAdminState, useCan, useCurrency } from "@/lib/velora/store";
import type { DraftOrder, OrderItem } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/drafts")({
  head: () => ({
    meta: [
      { title: "Draft orders — Velora Admin" },
      { name: "description", content: "Create draft orders, send payment links and convert them once paid." },
      { property: "og:title", content: "Draft orders — Velora Admin" },
      { property: "og:description", content: "Create draft orders, send payment links and convert them once paid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DraftsScreen,
});

type LineDraft = { productId: string; variantId: string; qty: number };

function DraftsScreen() {
  const state = useAdminState();
  const currency = useCurrency();
  const can = useCan();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [customerId, setCustomerId] = useState(state.customers[0]?.id ?? "");
  const [lines, setLines] = useState<LineDraft[]>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.draftOrders;
    return state.draftOrders.filter((d) => `${d.number} ${d.email} ${d.customerName}`.toLowerCase().includes(q));
  }, [state.draftOrders, search]);

  const addLine = () => {
    const product = state.products.find((p) => p.variants.length > 0);
    const variant = product?.variants[0];
    if (!product || !variant) return;
    setLines((ls) => [...ls, { productId: product.id, variantId: variant.id, qty: 1 }]);
  };

  const lineTotal = (l: LineDraft) => {
    const product = state.products.find((p) => p.id === l.productId);
    const variant = product?.variants.find((v) => v.id === l.variantId);
    return (variant?.price ?? 0) * l.qty;
  };
  const draftTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  const createDraft = () => {
    const customer = state.customers.find((c) => c.id === customerId);
    if (!customer || lines.length === 0) return;
    const items: OrderItem[] = lines
      .map((l) => {
        const product = state.products.find((p) => p.id === l.productId);
        const variant = product?.variants.find((v) => v.id === l.variantId);
        if (!product || !variant) return null;
        return {
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          sku: variant.sku,
          variantLabel: Object.values(variant.options).join(" / "),
          imageId: variant.imageId ?? product.primaryImageId,
          qty: l.qty,
          unitPrice: variant.price,
          unitCost: variant.cost,
          taxMinor: 0,
        } satisfies OrderItem;
      })
      .filter((it): it is OrderItem => it !== null);
    const number = nextOrderNumber();
    mutate(
      (draft) => {
        draft.draftOrders = [
          {
            id: `do-${Date.now()}`,
            number,
            customerName: customer.name,
            email: customer.email,
            items,
            createdAt: new Date().toISOString(),
            status: "Open",
          },
          ...draft.draftOrders,
        ];
      },
      { action: "draftOrder.create", entity: number, after: { customer: customer.name, items: items.length } },
    );
    setLines([]);
    setCreateOpen(false);
  };

  const sendPaymentLink = (d: DraftOrder) => {
    mutate(
      (draft) => {
        const target = draft.draftOrders.find((x) => x.id === d.id)!;
        target.status = "Payment link sent";
        draft.settings.emailLog = [
          {
            id: `el-${Date.now()}`,
            to: d.email,
            template: "Payment link",
            at: new Date().toISOString(),
            status: "Sent",
            providerId: "manual",
            error: null,
          },
          ...draft.settings.emailLog,
        ];
      },
      { action: "draftOrder.paymentLink", entity: d.number },
    );
  };

  const convertDraft = (d: DraftOrder) => {
    const number = nextOrderNumber();
    const customer = state.customers.find((c) => c.email === d.email);
    mutate(
      (draft) => {
        const target = draft.draftOrders.find((x) => x.id === d.id)!;
        target.status = "Converted";
        draft.orders = [
          {
            id: `o-${Date.now()}`,
            number,
            customerId: customer?.id ?? "guest",
            customerName: d.customerName,
            email: d.email,
            phone: customer?.phone ?? "",
            placedAt: new Date().toISOString(),
            status: "Confirmed",
            payment: "Paid",
            method: "Manual",
            device: "Desktop",
            channel: "Draft",
            country: customer?.country ?? "",
            city: customer?.city ?? "",
            couponCode: null,
            items: d.items,
            discountMinor: 0,
            shippingMinor: 0,
            shippingCostMinor: 0,
            taxMinor: 0,
            refundedMinor: 0,
            courier: null,
            tracking: null,
            shippingAddress: customer?.addresses[0] ?? { name: d.customerName, line1: "", city: "", postcode: "", country: "", phone: "" },
            billingAddress: customer?.addresses[0] ?? { name: d.customerName, line1: "", city: "", postcode: "", country: "", phone: "" },
            notes: [],
            history: [{ at: new Date().toISOString(), label: "Converted from draft order", actor: "You" }],
            isFirstOrder: false,
            invoiceNumber: null,
          },
          ...draft.orders,
        ];
      },
      { action: "draftOrder.convert", entity: d.number, after: { orderNumber: number } },
    );
  };

  const columns: Column<DraftOrder>[] = [
    { key: "number", header: "Number", value: (d) => d.number, render: (d) => <span className="tnum font-medium">{d.number}</span> },
    { key: "customer", header: "Customer", value: (d) => d.customerName, render: (d) => (
      <div className="min-w-0"><p className="truncate">{d.customerName}</p><p className="truncate text-[12px] text-muted">{d.email}</p></div>
    ) },
    { key: "items", header: "Items", value: (d) => d.items.reduce((s, it) => s + it.qty, 0), render: (d) => d.items.reduce((s, it) => s + it.qty, 0), align: "right" },
    { key: "total", header: "Total", value: (d) => d.items.reduce((s, it) => s + it.unitPrice * it.qty, 0), render: (d) => <Money minor={d.items.reduce((s, it) => s + it.unitPrice * it.qty, 0)} currency={currency} />, align: "right" },
    { key: "createdAt", header: "Created", value: (d) => d.createdAt, render: (d) => formatDateTime(d.createdAt), hideBelow: "md" },
    { key: "status", header: "Status", value: (d) => d.status, render: (d) => <StatusPill tone={d.status === "Converted" ? "green" : d.status === "Payment link sent" ? "blue" : "grey"}>{d.status}</StatusPill> },
    { key: "actions", header: "Actions", value: () => "", render: (d) => (
      <div className="flex justify-end gap-2">
        {d.status === "Open" && can("order.create") ? (
          <Button size="sm" icon={<Send className="size-3.5" />} onClick={() => sendPaymentLink(d)}>Send link</Button>
        ) : null}
        {d.status !== "Converted" && can("order.create") ? (
          <Button size="sm" variant="primary" onClick={() => convertDraft(d)}>Convert</Button>
        ) : null}
      </div>
    ), align: "right" },
  ];

  return (
    <AdminShell trail={[{ label: "Draft orders" }]}>
      <PageHeader
        eyebrow={`${state.draftOrders.length} drafts`}
        title="Draft orders"
        sub="Build orders manually for phone or in-person sales, send payment links, then convert to real orders."
        actions={can("order.create") ? <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setCreateOpen(true)}>New draft</Button> : undefined}
      />

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(d) => d.id}
        caption="Draft orders"
        search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: "Search number, email or name" }}
        page={page}
        pageSize={20}
        onPage={setPage}
        csvName="draft-orders"
        cardTitle={(d) => `${d.number} · ${d.customerName}`}
      />

      <Sheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New draft order"
        description="Pick a customer, add variants and quantities. Totals compute live."
        wide
        footer={
          <>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={createDraft} disabled={lines.length === 0}>Create draft</Button>
          </>
        }
      >
        <div className="space-y-4">
          <SelectField
            label="Customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={state.customers.map((c) => ({ value: c.id, label: `${c.name} · ${c.email}` }))}
          />

          <Panel title="Line items" actions={<Button size="sm" icon={<Plus className="size-3.5" />} onClick={addLine}>Add item</Button>}>
            {lines.length === 0 ? (
              <p className="text-[13px] text-muted">No items added yet.</p>
            ) : (
              <div className="space-y-3">
                {lines.map((l, i) => {
                  const product = state.products.find((p) => p.id === l.productId);
                  return (
                    <div key={i} className="flex flex-wrap items-end gap-2 rounded-[10px] border border-line p-3">
                      <SelectField
                        label="Product"
                        value={l.productId}
                        onChange={(e) => {
                          const p = state.products.find((x) => x.id === e.target.value);
                          setLines((ls) => ls.map((x, xi) => (xi === i ? { productId: e.target.value, variantId: p?.variants[0]?.id ?? "", qty: x.qty } : x)));
                        }}
                        options={state.products.filter((p) => p.variants.length > 0).map((p) => ({ value: p.id, label: p.name }))}
                        className="min-w-[180px] flex-1"
                      />
                      <SelectField
                        label="Variant"
                        value={l.variantId}
                        onChange={(e) => setLines((ls) => ls.map((x, xi) => (xi === i ? { ...x, variantId: e.target.value } : x)))}
                        options={(product?.variants ?? []).map((v) => ({ value: v.id, label: `${Object.values(v.options).join(" / ")} · ${v.sku}` }))}
                        className="min-w-[180px] flex-1"
                      />
                      <TextField
                        label="Qty"
                        type="number"
                        min={1}
                        value={l.qty}
                        onChange={(e) => setLines((ls) => ls.map((x, xi) => (xi === i ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)))}
                        className="w-20"
                      />
                      <div className="pb-2 text-[13px] tnum">
                        <Money minor={lineTotal(l)} currency={currency} />
                      </div>
                      <IconButton label="Remove item" icon={<Trash2 className="size-4" />} onClick={() => setLines((ls) => ls.filter((_, xi) => xi !== i))} />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Draft total">
            <p className="tnum text-[20px] font-semibold">
              <Money minor={draftTotal} currency={currency} />
            </p>
            <p className="mt-1 text-[12px] text-muted">Order number will be {nextOrderNumber()} once created.</p>
          </Panel>
        </div>
      </Sheet>
    </AdminShell>
  );
}
