import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/velora/AdminShell";
import { Button, PageHeader, SelectField, StatusPill, formatDateTime } from "@/components/velora/kit";
import { Column, DataTable } from "@/components/velora/DataTable";
import { mutate, useAdminState, useCan } from "@/lib/velora/store";
import type { BackInStockRequest } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/back-in-stock")({
  head: () => ({
    meta: [
      { title: "Back-in-stock requests — Velora Admin" },
      { name: "description", content: "See who is waiting for a product to come back into stock, and notify them." },
      { property: "og:title", content: "Back-in-stock requests — Velora Admin" },
      { property: "og:description", content: "See who is waiting for a product to come back into stock, and notify them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BackInStockScreen,
});

function BackInStockScreen() {
  const state = useAdminState();
  const can = useCan();
  const [product, setProduct] = useState("all");
  const [notified, setNotified] = useState("all");
  const [page, setPage] = useState(1);

  const productOptions = useMemo(() => [...new Set(state.backInStock.map((r) => r.productId))].map((pid) => ({ id: pid, name: state.products.find((p) => p.id === pid)?.name ?? pid })), [state.backInStock, state.products]);

  const rows = useMemo(
    () =>
      state.backInStock.filter((r) => {
        if (product !== "all" && r.productId !== product) return false;
        if (notified !== "all" && String(r.notified) !== notified) return false;
        return true;
      }),
    [state.backInStock, product, notified],
  );

  const notify = (r: BackInStockRequest) => {
    const productName = state.products.find((p) => p.id === r.productId)?.name ?? "product";
    mutate(
      (d) => {
        const req = d.backInStock.find((x) => x.id === r.id)!;
        req.notified = true;
        d.settings.emailLog = [
          { id: `el-${Date.now()}`, to: r.email, template: "Back in stock", at: new Date().toISOString(), status: "Sent", providerId: "smtp", error: null },
          ...d.settings.emailLog,
        ];
      },
      { action: "backInStock.notify", entity: `${r.email} · ${productName}` },
    );
  };

  const columns: Column<BackInStockRequest>[] = [
    {
      key: "product",
      header: "Product / variant",
      value: (r) => state.products.find((p) => p.id === r.productId)?.name ?? r.productId,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate">{state.products.find((p) => p.id === r.productId)?.name ?? r.productId}</p>
          <p className="truncate text-[12px] text-muted">{r.variantLabel}</p>
        </div>
      ),
    },
    { key: "email", header: "Email", value: (r) => r.email, render: (r) => r.email },
    { key: "at", header: "Requested at", value: (r) => r.at, render: (r) => formatDateTime(r.at) },
    {
      key: "notified",
      header: "Notified",
      value: (r) => String(r.notified),
      render: (r) => <StatusPill tone={r.notified ? "green" : "amber"}>{r.notified ? "Notified" : "Waiting"}</StatusPill>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        can("marketing.write") && !r.notified ? (
          <Button size="sm" onClick={() => notify(r)}>
            Notify customer
          </Button>
        ) : null,
    },
  ];

  return (
    <AdminShell trail={[{ label: "Back in stock" }]}>
      <PageHeader eyebrow="Marketing" title="Back-in-stock requests" sub={`${state.backInStock.length} requests recorded.`} />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        caption="Back-in-stock requests"
        filters={
          <>
            <SelectField label="Product" aria-label="Filter by product" value={product} onChange={(e) => { setProduct(e.target.value); setPage(1); }} options={[{ value: "all", label: "All products" }, ...productOptions.map((p) => ({ value: p.id, label: p.name }))]} className="w-56" />
            <SelectField label="Notified" aria-label="Filter by notified state" value={notified} onChange={(e) => { setNotified(e.target.value); setPage(1); }} options={[{ value: "all", label: "Any state" }, { value: "true", label: "Notified" }, { value: "false", label: "Waiting" }]} className="w-40" />
          </>
        }
        page={page}
        pageSize={20}
        onPage={setPage}
        csvName="velora-back-in-stock"
        cardTitle={(r) => r.email}
        emptyTitle="No requests match"
      />
    </AdminShell>
  );
}
