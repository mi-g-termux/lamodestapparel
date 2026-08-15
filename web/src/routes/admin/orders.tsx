import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  ConfirmDialog,
  Money,
  PageHeader,
  Panel,
  SelectField,
  StatusPill,
  TextField,
  formatDateTime,
} from "@/components/velora/kit";
import { Column, DataTable } from "@/components/velora/DataTable";
import { mutate, useAdminState, useCan, useCurrency } from "@/lib/velora/store";
import { orderTotal } from "@/lib/velora/store";
import { orderStatuses, orderStatusTone, paymentStatuses, paymentTone, type OrderStatus } from "@/lib/velora/status";
import type { Order } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Velora Admin" },
      { name: "description", content: "Search, filter and manage every order placed in the store." },
      { property: "og:title", content: "Orders — Velora Admin" },
      { property: "og:description", content: "Search, filter and manage every order placed in the store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrdersScreen,
});

function OrdersScreen() {
  const state = useAdminState();
  const currency = useCurrency();
  const can = useCan();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [payment, setPayment] = useState("All");
  const [country, setCountry] = useState("All");
  const [coupon, setCoupon] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "placedAt", dir: "desc" });
  const [savedName, setSavedName] = useState("");
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("Confirmed");
  const [confirmBulk, setConfirmBulk] = useState<{ ids: string[]; clear: () => void } | null>(null);

  const countries = useMemo(() => [...new Set(state.orders.map((o) => o.country))].sort(), [state.orders]);
  const coupons = useMemo(
    () => [...new Set(state.orders.map((o) => o.couponCode).filter((c): c is string => Boolean(c)))].sort(),
    [state.orders],
  );
  const savedViews = state.savedViews.filter((v) => v.scope === "orders");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.orders.filter((o) => {
      if (q) {
        const hay = `${o.number} ${o.email} ${o.customerName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status !== "All" && o.status !== status) return false;
      if (payment !== "All" && o.payment !== payment) return false;
      if (country !== "All" && o.country !== country) return false;
      if (coupon !== "All" && o.couponCode !== coupon) return false;
      if (from && new Date(o.placedAt) < new Date(from)) return false;
      if (to && new Date(o.placedAt) > new Date(`${to}T23:59:59`)) return false;
      return true;
    });
  }, [state.orders, search, status, payment, country, coupon, from, to]);

  const applyView = (query: string) => {
    try {
      const q = JSON.parse(query) as Record<string, string>;
      setSearch(q["search"] ?? "");
      setStatus(q["status"] ?? "All");
      setPayment(q["payment"] ?? "All");
      setCountry(q["country"] ?? "All");
      setCoupon(q["coupon"] ?? "All");
      setFrom(q["from"] ?? "");
      setTo(q["to"] ?? "");
      setPage(1);
    } catch {
      /* ignore corrupt saved view */
    }
  };

  const saveView = () => {
    if (!savedName.trim()) return;
    const query = JSON.stringify({ search, status, payment, country, coupon, from, to });
    mutate(
      (draft) => {
        draft.savedViews = [
          ...draft.savedViews,
          { id: `sv-${Date.now()}`, scope: "orders", name: savedName.trim(), query },
        ];
      },
      { action: "savedView.create", entity: savedName.trim(), after: { query } },
    );
    setSavedName("");
  };

  const chips = [
    status !== "All" ? { label: `Status: ${status}`, onClear: () => setStatus("All") } : null,
    payment !== "All" ? { label: `Payment: ${payment}`, onClear: () => setPayment("All") } : null,
    country !== "All" ? { label: `Country: ${country}`, onClear: () => setCountry("All") } : null,
    coupon !== "All" ? { label: `Coupon: ${coupon}`, onClear: () => setCoupon("All") } : null,
    from ? { label: `From: ${from}`, onClear: () => setFrom("") } : null,
    to ? { label: `To: ${to}`, onClear: () => setTo("") } : null,
  ].filter((c): c is { label: string; onClear: () => void } => c !== null);

  const columns: Column<Order>[] = [
    { key: "number", header: "Number", value: (o) => o.number, render: (o) => <span className="tnum font-medium">{o.number}</span> },
    { key: "placedAt", header: "Placed", value: (o) => o.placedAt, render: (o) => formatDateTime(o.placedAt), hideBelow: "md" },
    { key: "customer", header: "Customer", value: (o) => o.customerName, render: (o) => (
      <div className="min-w-0">
        <p className="truncate">{o.customerName}</p>
        <p className="truncate text-[12px] text-muted">{o.email}</p>
      </div>
    ) },
    { key: "items", header: "Items", value: (o) => o.items.reduce((s, it) => s + it.qty, 0), render: (o) => o.items.reduce((s, it) => s + it.qty, 0), align: "right", hideBelow: "lg" },
    { key: "total", header: "Total", value: (o) => orderTotal(o), render: (o) => <Money minor={orderTotal(o)} currency={currency} />, align: "right" },
    { key: "payment", header: "Payment", value: (o) => o.payment, render: (o) => <StatusPill tone={paymentTone[o.payment]}>{o.payment}</StatusPill> },
    { key: "status", header: "Status", value: (o) => o.status, render: (o) => <StatusPill tone={orderStatusTone[o.status]}>{o.status}</StatusPill> },
    { key: "country", header: "Country/device", value: (o) => o.country, render: (o) => (
      <span className="text-[12px] text-muted">{o.country} · {o.device}</span>
    ), hideBelow: "lg" },
  ];

  return (
    <AdminShell trail={[{ label: "Orders" }]}>
      <PageHeader
        eyebrow={`${filtered.length} of ${state.orders.length} orders`}
        title="Orders"
        sub="Every order placed in the store, with search, filters and audited bulk actions."
      />

      {savedViews.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {savedViews.map((v) => (
            <button key={v.id} onClick={() => applyView(v.query)} className="pill bg-cream text-ink hover:bg-sand">
              {v.name}
            </button>
          ))}
        </div>
      ) : null}

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(o) => o.id}
        caption="Orders"
        search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: "Search number, email or name" }}
        chips={chips}
        page={page}
        pageSize={20}
        onPage={setPage}
        sort={sort}
        onSort={setSort}
        csvName="orders"
        onRowClick={(o) => navigate({ to: "/admin/orders/$id", params: { id: o.id } })}
        cardTitle={(o) => `${o.number} · ${o.customerName}`}
        filters={
          <>
            <SelectField label="" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: "All", label: "All statuses" }, ...orderStatuses.map((s) => ({ value: s, label: s }))]} className="min-w-[140px]" />
            <SelectField label="" aria-label="Payment" value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1); }} options={[{ value: "All", label: "All payments" }, ...paymentStatuses.map((s) => ({ value: s, label: s }))]} className="min-w-[140px]" />
            <SelectField label="" aria-label="Country" value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} options={[{ value: "All", label: "All countries" }, ...countries.map((c) => ({ value: c, label: c }))]} className="min-w-[140px]" />
            <SelectField label="" aria-label="Coupon" value={coupon} onChange={(e) => { setCoupon(e.target.value); setPage(1); }} options={[{ value: "All", label: "All coupons" }, ...coupons.map((c) => ({ value: c, label: c }))]} className="min-w-[140px]" />
            <input type="date" aria-label="From date" className="field w-auto" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <input type="date" aria-label="To date" className="field w-auto" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </>
        }
        bulkActions={can("order.status.update") ? (selected, clear) => (
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Bulk status"
              className="field !min-h-[36px] w-auto bg-surface text-ink"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
            >
              {orderStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setConfirmBulk({ ids: selected.map((o) => o.id), clear })}
            >
              Update status
            </Button>
          </div>
        ) : undefined}
      />

      {can("order.read") ? (
        <Panel title="Save current filters as a view">
          <div className="flex flex-wrap items-end gap-2">
            <TextField label="View name" value={savedName} onChange={(e) => setSavedName(e.target.value)} placeholder="e.g. Pending payments" className="max-w-xs" />
            <Button icon={<Save className="size-3.5" />} onClick={saveView} disabled={!savedName.trim()}>
              Save view
            </Button>
          </div>
        </Panel>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmBulk)}
        onOpenChange={(v) => { if (!v) setConfirmBulk(null); }}
        title={`Update ${confirmBulk?.ids.length ?? 0} orders to “${bulkStatus}”`}
        body="Each order's history will record this change with your name."
        confirmLabel="Update status"
        onConfirm={() => {
          if (!confirmBulk) return;
          const ids = new Set(confirmBulk.ids);
          mutate(
            (draft) => {
              for (const o of draft.orders) {
                if (!ids.has(o.id)) continue;
                o.status = bulkStatus;
                o.history.push({ at: new Date().toISOString(), label: `Status changed to ${bulkStatus}`, actor: "You" });
              }
            },
            { action: "order.status.bulkUpdate", entity: `${ids.size} orders`, after: { status: bulkStatus } },
          );
          confirmBulk.clear();
          setConfirmBulk(null);
        }}
      />
    </AdminShell>
  );
}
