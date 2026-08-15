import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/velora/AdminShell";
import { EmptyState, PageHeader, Panel, SelectField, Sheet, TextField, formatDateTime } from "@/components/velora/kit";
import { DataTable, type Column } from "@/components/velora/DataTable";
import { useAdminState, useCan } from "@/lib/velora/store";
import { downloadCsv } from "@/lib/velora/csv";
import type { AuditEntry } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit log — Velora Admin" },
      { name: "description", content: "Every write made in the admin, with actor, action, entity and before/after detail." },
      { property: "og:title", content: "Audit log — Velora Admin" },
      { property: "og:description", content: "Searchable, exportable record of every admin write." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const state = useAdminState();
  const can = useCan();

  const [search, setSearch] = useState("");
  const [actor, setActor] = useState("all");
  const [action, setAction] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditEntry | null>(null);

  const actors = useMemo(() => Array.from(new Set(state.audit.map((a) => a.actor))).sort(), [state.audit]);
  const actions = useMemo(() => Array.from(new Set(state.audit.map((a) => a.action))).sort(), [state.audit]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = from ? new Date(from).getTime() : null;
    const toMs = to ? new Date(to).getTime() + 86_400_000 : null;
    return state.audit.filter((a) => {
      if (actor !== "all" && a.actor !== actor) return false;
      if (action !== "all" && a.action !== action) return false;
      const at = new Date(a.at).getTime();
      if (fromMs !== null && at < fromMs) return false;
      if (toMs !== null && at > toMs) return false;
      if (q && !(a.actor.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || a.entity.toLowerCase().includes(q) || a.ip.includes(q))) {
        return false;
      }
      return true;
    });
  }, [state.audit, search, actor, action, from, to]);

  if (!can("audit.view")) {
    return (
      <AdminShell trail={[{ label: "Audit log" }]}>
        <PageHeader title="Audit log" />
        <EmptyState title="No access" body="You don't have permission to view the audit log." icon={<ShieldAlert className="size-6" />} />
      </AdminShell>
    );
  }

  const exportCsv = () => {
    downloadCsv(
      `velora-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((a) => ({
        When: formatDateTime(a.at),
        Actor: a.actor,
        Action: a.action,
        Entity: a.entity,
        IP: a.ip,
      })),
    );
  };

  const columns: Column<AuditEntry>[] = [
    { key: "at", header: "When", value: (r) => r.at, render: (r) => <span className="tnum">{formatDateTime(r.at)}</span> },
    { key: "actor", header: "Actor", value: (r) => r.actor, render: (r) => r.actor },
    { key: "action", header: "Action", value: (r) => r.action, render: (r) => <span className="font-mono text-[12px]">{r.action}</span> },
    { key: "entity", header: "Entity", value: (r) => r.entity, render: (r) => <span className="truncate">{r.entity}</span> },
    { key: "ip", header: "IP address", value: (r) => r.ip, render: (r) => <span className="tnum text-muted">{r.ip}</span> },
  ];

  return (
    <AdminShell trail={[{ label: "Audit log" }]}>
      <PageHeader
        eyebrow="System"
        title="Audit log"
        sub="Every write made through the admin, recorded with actor, action, entity and IP address."
      />

      <Panel title="Filters">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Actor"
            value={actor}
            onChange={(e) => {
              setActor(e.target.value);
              setPage(1);
            }}
            options={[{ value: "all", label: "All actors" }, ...actors.map((a) => ({ value: a, label: a }))]}
          />
          <SelectField
            label="Action"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            options={[{ value: "all", label: "All actions" }, ...actions.map((a) => ({ value: a, label: a }))]}
          />
          <TextField
            label="From"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <TextField
            label="To"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Panel>

      <Panel title="Entries" description={`${filtered.length} of ${state.audit.length} entries`}>
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id}
          caption="Audit log entries"
          search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: "Search actor, action, entity or IP" }}
          page={page}
          pageSize={20}
          onPage={setPage}
          onRowClick={(r) => setDetail(r)}
          toolbarExtra={
            <button className="btn btn-ghost btn-sm" onClick={exportCsv}>
              <Download className="size-3.5" /> CSV
            </button>
          }
          emptyTitle="No audit entries match your filters"
        />
      </Panel>

      <Sheet
        open={Boolean(detail)}
        onOpenChange={(v) => !v && setDetail(null)}
        title={detail ? `${detail.action} · ${detail.entity}` : ""}
        description={detail ? `${detail.actor} · ${formatDateTime(detail.at)} · ${detail.ip}` : undefined}
        wide
        side="right"
      >
        {detail ? <AuditDiff entry={detail} /> : null}
      </Sheet>
    </AdminShell>
  );
}

function AuditDiff({ entry }: { entry: AuditEntry }) {
  const before = entry.before ?? null;
  const after = entry.after ?? null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <p className="eyebrow mb-2">Before</p>
        <pre className="max-h-[60vh] overflow-auto rounded-[10px] border border-line bg-bg-subtle p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
          {before === null ? "No prior state recorded." : JSON.stringify(before, null, 2)}
        </pre>
      </div>
      <div>
        <p className="eyebrow mb-2">After</p>
        <pre className="max-h-[60vh] overflow-auto rounded-[10px] border border-line bg-bg-subtle p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
          {after === null ? "No new state recorded." : JSON.stringify(after, null, 2)}
        </pre>
      </div>
    </div>
  );
}
