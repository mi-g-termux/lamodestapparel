import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { AdminShell } from "@/components/velora/AdminShell";
import { Button, PageHeader, SelectField, Sheet, StatusPill, TextField, formatDateTime } from "@/components/velora/kit";
import { Column, DataTable } from "@/components/velora/DataTable";
import { mutate, useAdminState, useCan } from "@/lib/velora/store";
import type { Subscriber } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/subscribers")({
  head: () => ({
    meta: [
      { title: "Newsletter subscribers — Velora Admin" },
      { name: "description", content: "Manage newsletter subscribers, consent and status." },
      { property: "og:title", content: "Newsletter subscribers — Velora Admin" },
      { property: "og:description", content: "Manage newsletter subscribers, consent and status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SubscribersScreen,
});

function SubscribersScreen() {
  const state = useAdminState();
  const can = useCan();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Manual");

  const filtered = useMemo(
    () =>
      state.subscribers.filter((s) => {
        if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
        if (status !== "all" && s.status !== status) return false;
        return true;
      }),
    [state.subscribers, search, status],
  );

  const columns: Column<Subscriber>[] = [
    { key: "email", header: "Email", value: (r) => r.email, render: (r) => r.email },
    { key: "source", header: "Source", value: (r) => r.source, render: (r) => r.source },
    {
      key: "consent",
      header: "Consent proof",
      value: (r) => r.consentAt,
      render: (r) => (
        <span className="text-[12px] text-muted">
          Consented {formatDateTime(r.consentAt)} via {r.source}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      value: (r) => r.status,
      render: (r) => <StatusPill tone={r.status === "Subscribed" ? "green" : "grey"}>{r.status}</StatusPill>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        can("marketing.write") ? (
          <Button
            size="sm"
            onClick={() =>
              mutate(
                (d) => {
                  const s = d.subscribers.find((x) => x.id === r.id)!;
                  s.status = s.status === "Subscribed" ? "Unsubscribed" : "Subscribed";
                },
                { action: "subscriber.status.update", entity: r.email },
              )
            }
          >
            {r.status === "Subscribed" ? "Unsubscribe" : "Resubscribe"}
          </Button>
        ) : null,
    },
  ];

  return (
    <AdminShell trail={[{ label: "Subscribers" }]}>
      <PageHeader
        eyebrow="Marketing"
        title="Newsletter subscribers"
        sub={`${state.subscribers.length} people on the newsletter list.`}
        actions={
          can("marketing.write") ? (
            <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setAddOpen(true)}>
              Add subscriber
            </Button>
          ) : undefined
        }
      />
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        caption="Subscribers"
        search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: "Search email" }}
        filters={
          <SelectField
            label="Status"
            aria-label="Filter by status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[{ value: "all", label: "Any status" }, { value: "Subscribed", label: "Subscribed" }, { value: "Unsubscribed", label: "Unsubscribed" }]}
            className="w-44"
          />
        }
        page={page}
        pageSize={20}
        onPage={setPage}
        csvName="velora-subscribers"
        cardTitle={(r) => r.email}
        emptyTitle="No subscribers match"
      />

      <Sheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add subscriber"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!email.trim()}
              onClick={() => {
                mutate(
                  (d) => {
                    d.subscribers = [
                      { id: `sub-${Date.now()}`, email: email.trim(), source, consentAt: new Date().toISOString(), status: "Subscribed" },
                      ...d.subscribers,
                    ];
                  },
                  { action: "subscriber.create", entity: email.trim() },
                );
                setAddOpen(false);
                setEmail("");
              }}
            >
              Add
            </Button>
          </>
        }
      >
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <div className="mt-4">
          <TextField label="Source" value={source} onChange={(e) => setSource(e.target.value)} helper="Recorded as the consent proof." />
        </div>
      </Sheet>
    </AdminShell>
  );
}
