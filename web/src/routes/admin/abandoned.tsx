import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { AdminShell } from "@/components/velora/AdminShell";
import { Button, Money, PageHeader, StatusPill, formatDateTime, relativeTime } from "@/components/velora/kit";
import { Column, DataTable } from "@/components/velora/DataTable";
import { mutate, useAdminState, useCan, useCurrency } from "@/lib/velora/store";
import type { AbandonedCart } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/abandoned")({
  head: () => ({
    meta: [
      { title: "Abandoned carts — Velora Admin" },
      { name: "description", content: "Recover lost sales by emailing shoppers who left items in their cart." },
      { property: "og:title", content: "Abandoned carts — Velora Admin" },
      { property: "og:description", content: "Recover lost sales by emailing shoppers who left items in their cart." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AbandonedScreen,
});

function AbandonedScreen() {
  const state = useAdminState();
  const currency = useCurrency();
  const can = useCan();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.abandonedCarts;
    return state.abandonedCarts.filter((c) => `${c.email} ${c.name}`.toLowerCase().includes(q));
  }, [state.abandonedCarts, search]);

  const sendRecovery = (c: AbandonedCart) => {
    mutate(
      (draft) => {
        const t = draft.abandonedCarts.find((x) => x.id === c.id)!;
        t.emailsSent += 1;
        draft.settings.emailLog = [
          { id: `el-${Date.now()}`, to: c.email, template: "Cart recovery", at: new Date().toISOString(), status: "Sent", providerId: "manual", error: null },
          ...draft.settings.emailLog,
        ];
      },
      { action: "abandonedCart.recoveryEmail", entity: c.email },
    );
  };

  const markRecovered = (c: AbandonedCart) => {
    mutate(
      (draft) => {
        draft.abandonedCarts.find((x) => x.id === c.id)!.recovered = true;
      },
      { action: "abandonedCart.markRecovered", entity: c.email },
    );
  };

  const columns: Column<AbandonedCart>[] = [
    { key: "name", header: "Shopper", value: (c) => c.name, render: (c) => (
      <div className="min-w-0"><p className="truncate">{c.name}</p><p className="truncate text-[12px] text-muted">{c.email}</p></div>
    ) },
    { key: "value", header: "Value", value: (c) => c.valueMinor, render: (c) => <Money minor={c.valueMinor} currency={currency} />, align: "right" },
    { key: "items", header: "Items", value: (c) => c.items, render: (c) => c.items, align: "right" },
    { key: "lastActive", header: "Last active", value: (c) => c.lastActiveAt, render: (c) => relativeTime(c.lastActiveAt), hideBelow: "md" },
    { key: "emailsSent", header: "Emails sent", value: (c) => c.emailsSent, render: (c) => c.emailsSent, align: "right" },
    { key: "recovered", header: "Recovered", value: (c) => (c.recovered ? "Yes" : "No"), render: (c) => (
      <StatusPill tone={c.recovered ? "green" : "grey"}>{c.recovered ? "Recovered" : "Not recovered"}</StatusPill>
    ) },
    { key: "actions", header: "Actions", value: () => "", render: (c) => (
      <div className="flex justify-end gap-2">
        {!c.recovered && can("marketing.write") ? (
          <>
            <Button size="sm" icon={<Mail className="size-3.5" />} onClick={() => sendRecovery(c)}>Send email</Button>
            <Button size="sm" variant="primary" icon={<CheckCircle2 className="size-3.5" />} onClick={() => markRecovered(c)}>Mark recovered</Button>
          </>
        ) : null}
      </div>
    ), align: "right" },
  ];

  return (
    <AdminShell trail={[{ label: "Abandoned carts" }]}>
      <PageHeader
        eyebrow={`${state.abandonedCarts.filter((c) => !c.recovered).length} not yet recovered`}
        title="Abandoned carts"
        sub="Shoppers who added items but did not complete checkout."
      />
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(c) => c.id}
        caption="Abandoned carts"
        search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: "Search email or name" }}
        page={page}
        pageSize={20}
        onPage={setPage}
        csvName="abandoned-carts"
        cardTitle={(c) => `${c.name} · ${c.email}`}
      />
    </AdminShell>
  );
}
