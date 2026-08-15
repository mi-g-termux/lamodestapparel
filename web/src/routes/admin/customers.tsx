import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Tag, UserCheck } from "lucide-react";
import { AdminShell } from "@/components/velora/AdminShell";
import { Button, InlineBanner, PageHeader, SelectField, Sheet, StatusPill, TextField, formatDate } from "@/components/velora/kit";
import { Column, DataTable } from "@/components/velora/DataTable";
import { useAdminState, useCan, useCurrency, mutate, orderTotal } from "@/lib/velora/store";
import { formatMoney } from "@/lib/velora/money";
import { downloadCsv } from "@/lib/velora/csv";
import type { Customer } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Velora Admin" },
      { name: "description", content: "Search, filter and manage every Velora customer record." },
      { property: "og:title", content: "Customers — Velora Admin" },
      { property: "og:description", content: "Search, filter and manage every Velora customer record." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CustomersScreen,
});

type Row = Customer & { orders: number; spendMinor: number };

function CustomersScreen() {
  const state = useAdminState();
  const currency = useCurrency();
  const can = useCan();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("all");
  const [country, setCountry] = useState("all");
  const [marketing, setMarketing] = useState("all");
  const [blocked, setBlocked] = useState("all");
  const [verified, setVerified] = useState("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "joined", dir: "desc" });
  const [tagTargets, setTagTargets] = useState<Row[] | null>(null);
  const [tagValue, setTagValue] = useState("");

  const countries = useMemo(() => [...new Set(state.customers.map((c) => c.country))].sort(), [state.customers]);

  const rows = useMemo<Row[]>(() => {
    return state.customers.map((c) => {
      const orders = state.orders.filter((o) => o.customerId === c.id);
      return { ...c, orders: orders.length, spendMinor: orders.reduce((s, o) => s + orderTotal(o), 0) };
    });
  }, [state.customers, state.orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((c) => {
      if (q && !`${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q)) return false;
      if (tier !== "all" && c.tier !== tier) return false;
      if (country !== "all" && c.country !== country) return false;
      if (marketing !== "all" && String(c.marketing) !== marketing) return false;
      if (blocked !== "all" && String(c.blocked) !== blocked) return false;
      if (verified !== "all") {
        const isVerified = c.emailVerified && c.phoneVerified;
        if (String(isVerified) !== verified) return false;
      }
      return true;
    });
  }, [rows, search, tier, country, marketing, blocked, verified]);

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Customer",
      value: (r) => r.name,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.name}</p>
          <p className="truncate text-[12px] text-muted">{r.email}</p>
        </div>
      ),
    },
    { key: "phone", header: "Phone", value: (r) => r.phone, render: (r) => r.phone, hideBelow: "md" },
    {
      key: "location",
      header: "Country / city",
      value: (r) => `${r.country} ${r.city}`,
      render: (r) => (
        <span>
          {r.country} · {r.city}
        </span>
      ),
      hideBelow: "md",
    },
    { key: "joined", header: "Joined", value: (r) => r.joined, render: (r) => formatDate(r.joined), hideBelow: "sm" },
    {
      key: "tier",
      header: "Tier",
      value: (r) => r.tier,
      render: (r) => <StatusPill tone={r.tier === "VIP" ? "purple" : r.tier === "Returning" ? "blue" : "grey"}>{r.tier}</StatusPill>,
    },
    { key: "orders", header: "Orders", align: "right", value: (r) => r.orders, render: (r) => r.orders },
    {
      key: "spend",
      header: "Lifetime spend",
      align: "right",
      value: (r) => r.spendMinor,
      render: (r) => formatMoney(r.spendMinor, currency),
    },
    {
      key: "marketing",
      header: "Marketing",
      value: (r) => String(r.marketing),
      render: (r) => <StatusPill tone={r.marketing ? "green" : "grey"}>{r.marketing ? "Opted in" : "Opted out"}</StatusPill>,
      hideBelow: "lg",
    },
    {
      key: "verified",
      header: "Verified",
      value: (r) => String(r.emailVerified && r.phoneVerified),
      render: (r) => (
        <span className="text-[12px] text-muted">
          {r.emailVerified ? "Email ✓" : "Email ✕"} · {r.phoneVerified ? "Phone ✓" : "Phone ✕"}
        </span>
      ),
      hideBelow: "lg",
    },
    {
      key: "blocked",
      header: "Status",
      value: (r) => String(r.blocked),
      render: (r) => <StatusPill tone={r.blocked ? "red" : "green"}>{r.blocked ? "Blocked" : "Active"}</StatusPill>,
    },
  ];

  const exportCsv = () => {
    downloadCsv(
      `velora-customers-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((c) => ({
        Name: c.name,
        Email: c.email,
        Phone: c.phone,
        Country: c.country,
        City: c.city,
        Joined: c.joined,
        Tier: c.tier,
        Orders: c.orders,
        "Lifetime spend": formatMoney(c.spendMinor, currency),
        Marketing: c.marketing ? "Yes" : "No",
        "Email verified": c.emailVerified ? "Yes" : "No",
        "Phone verified": c.phoneVerified ? "Yes" : "No",
        Blocked: c.blocked ? "Yes" : "No",
      })),
    );
  };

  return (
    <AdminShell trail={[{ label: "Customers" }]}>
      <PageHeader
        eyebrow="People"
        title="Customers"
        sub={`${state.customers.length} customer records, ranked by real order history.`}
        actions={
          can("customer.export") ? (
            <Button icon={<Download className="size-3.5" />} onClick={exportCsv}>
              Export CSV
            </Button>
          ) : undefined
        }
      />

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        caption="Customers"
        search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: "Search name, email or phone" }}
        filters={
          <>
            <SelectField label="Tier" aria-label="Filter by tier" value={tier} onChange={(e) => { setTier(e.target.value); setPage(1); }} options={[{ value: "all", label: "All tiers" }, { value: "New", label: "New" }, { value: "Returning", label: "Returning" }, { value: "VIP", label: "VIP" }]} className="w-40" />
            <SelectField label="Country" aria-label="Filter by country" value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} options={[{ value: "all", label: "All countries" }, ...countries.map((c) => ({ value: c, label: c }))]} className="w-40" />
            <SelectField label="Marketing" aria-label="Filter by marketing" value={marketing} onChange={(e) => { setMarketing(e.target.value); setPage(1); }} options={[{ value: "all", label: "Any consent" }, { value: "true", label: "Opted in" }, { value: "false", label: "Opted out" }]} className="w-36" />
            <SelectField label="Verified" aria-label="Filter by verification" value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }} options={[{ value: "all", label: "Any verification" }, { value: "true", label: "Fully verified" }, { value: "false", label: "Not fully verified" }]} className="w-44" />
            <SelectField label="Blocked" aria-label="Filter by blocked status" value={blocked} onChange={(e) => { setBlocked(e.target.value); setPage(1); }} options={[{ value: "all", label: "Any status" }, { value: "false", label: "Active" }, { value: "true", label: "Blocked" }]} className="w-36" />
          </>
        }
        chips={[
          tier !== "all" ? { label: `Tier: ${tier}`, onClear: () => setTier("all") } : null,
          country !== "all" ? { label: `Country: ${country}`, onClear: () => setCountry("all") } : null,
          marketing !== "all" ? { label: `Marketing: ${marketing === "true" ? "Opted in" : "Opted out"}`, onClear: () => setMarketing("all") } : null,
          verified !== "all" ? { label: `Verified: ${verified === "true" ? "Yes" : "No"}`, onClear: () => setVerified("all") } : null,
          blocked !== "all" ? { label: `Blocked: ${blocked === "true" ? "Yes" : "No"}`, onClear: () => setBlocked("all") } : null,
        ].filter((c): c is { label: string; onClear: () => void } => c !== null)}
        sort={sort}
        onSort={setSort}
        page={page}
        pageSize={20}
        onPage={setPage}
        onRowClick={(r) => navigate({ to: "/admin/customers/$id", params: { id: r.id } })}
        cardTitle={(r) => r.name}
        emptyTitle="No customers match"
        emptyBody="Try clearing filters or search terms."
        csvName={can("customer.export") ? "velora-customers" : undefined}
        bulkActions={
          can("customer.write")
            ? (selected, clear) => (
                <>
                  <Button size="sm" icon={<Tag className="size-3.5" />} onClick={() => setTagTargets(selected)}>
                    Tag {selected.length}
                  </Button>
                  <Button
                    size="sm"
                    icon={<UserCheck className="size-3.5" />}
                    onClick={() => {
                      mutate(
                        (draft) => {
                          for (const s of selected) {
                            const c = draft.customers.find((x) => x.id === s.id);
                            if (c) c.marketing = true;
                          }
                        },
                        { action: "customer.consent.update", entity: `${selected.length} customers`, after: { marketing: true } },
                      );
                      clear();
                    }}
                  >
                    Opt in to marketing
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      mutate(
                        (draft) => {
                          for (const s of selected) {
                            const c = draft.customers.find((x) => x.id === s.id);
                            if (c) c.marketing = false;
                          }
                        },
                        { action: "customer.consent.update", entity: `${selected.length} customers`, after: { marketing: false } },
                      );
                      clear();
                    }}
                  >
                    Opt out
                  </Button>
                </>
              )
            : undefined
        }
      />

      <Sheet
        open={tagTargets !== null}
        onOpenChange={(v) => { if (!v) { setTagTargets(null); setTagValue(""); } }}
        title="Add a tag"
        description={tagTargets ? `Applies to ${tagTargets.length} selected customer${tagTargets.length === 1 ? "" : "s"}.` : undefined}
        footer={
          <>
            <Button onClick={() => setTagTargets(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!tagValue.trim()}
              onClick={() => {
                const ids = new Set((tagTargets ?? []).map((r) => r.id));
                mutate(
                  (draft) => {
                    for (const c of draft.customers) {
                      if (ids.has(c.id) && !c.tags.includes(tagValue.trim())) c.tags = [...c.tags, tagValue.trim()];
                    }
                  },
                  { action: "customer.tag.add", entity: `${ids.size} customers`, after: { tag: tagValue.trim() } },
                );
                setTagTargets(null);
                setTagValue("");
              }}
            >
              Apply tag
            </Button>
          </>
        }
      >
        <TextField label="Tag" value={tagValue} onChange={(e) => setTagValue(e.target.value)} placeholder="e.g. wholesale" autoFocus />
        <InlineBanner tone="info" title="Bulk tagging" body="This tag is appended to every selected customer's profile." />
      </Sheet>
    </AdminShell>
  );
}
