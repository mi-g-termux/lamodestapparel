import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Grid,
  KeyValue,
  Labelled,
  PageHeader,
  Panel,
  SaveBar,
  SelectField,
  Sheet,
  StatusPill,
  TextArea,
  TextField,
  Toggle,
  formatDate,
  useDraft,
} from "@/components/velora/kit";
import { mutate, orderTotal, useAdminState, useCan, useCurrency } from "@/lib/velora/store";
import { formatMoney } from "@/lib/velora/money";
import type { Address, Customer } from "@/lib/velora/types";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/customers/$id")({
  head: () => ({
    meta: [
      { title: "Customer profile — Velora Admin" },
      { name: "description", content: "Full customer profile: contact details, addresses, orders, wishlist and reviews." },
      { property: "og:title", content: "Customer profile — Velora Admin" },
      { property: "og:description", content: "Full customer profile: contact details, addresses, orders, wishlist and reviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CustomerDetail,
});

const emptyAddress = (): Address => ({ name: "", line1: "", line2: "", city: "", postcode: "", country: "", phone: "" });

function CustomerDetail() {
  const { id } = useParams({ from: "/admin/customers/$id" });
  const state = useAdminState();
  const currency = useCurrency();
  const can = useCan();
  const navigate = useNavigate();

  const customer = state.customers.find((c) => c.id === id);
  const { draft, setDraft, dirty, reset, commit } = useDraft<Customer>(customer ?? ({} as Customer));
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrIndex, setAddrIndex] = useState<number | null>(null);
  const [addrDraft, setAddrDraft] = useState<Address>(emptyAddress());

  const orders = useMemo(() => state.orders.filter((o) => o.customerId === id).sort((a, b) => b.placedAt.localeCompare(a.placedAt)), [state.orders, id]);
  const reviews = useMemo(() => (customer ? state.reviews.filter((r) => r.email === customer.email) : []), [state.reviews, customer]);
  const messages = useMemo(() => (customer ? state.messages.filter((m) => m.email === customer.email) : []), [state.messages, customer]);
  const wishlistProducts = useMemo(
    () => (customer ? customer.wishlist.map((pid) => state.products.find((p) => p.id === pid)).filter((p): p is NonNullable<typeof p> => Boolean(p)) : []),
    [customer, state.products],
  );

  if (!customer) {
    return (
      <AdminShell trail={[{ label: "Customers", to: "/admin/customers" }, { label: "Not found" }]}>
        <EmptyState title="Customer not found" body="This record may have been removed." action={<Link to="/admin/customers" className="btn btn-ghost">Back to customers</Link>} />
      </AdminShell>
    );
  }

  const spendMinor = orders.reduce((s, o) => s + orderTotal(o), 0);
  const aov = orders.length ? Math.round(spendMinor / orders.length) : 0;
  const lastOrder = orders[0];

  const save = () => {
    mutate(
      (d) => {
        const c = d.customers.find((x) => x.id === id)!;
        Object.assign(c, draft);
      },
      { action: "customer.update", entity: draft.name, before: customer, after: draft },
    );
    commit();
    toast.success("Customer profile saved");
  };

  const saveAddresses = (addresses: Address[], action: string) => {
    mutate(
      (d) => {
        const c = d.customers.find((x) => x.id === id)!;
        c.addresses = addresses;
      },
      { action, entity: customer.name },
    );
    setDraft((prev) => ({ ...prev, addresses }));
  };

  const toggleBlocked = () => {
    const next = !customer.blocked;
    mutate(
      (d) => {
        d.customers.find((x) => x.id === id)!.blocked = next;
      },
      { action: "customer.block.update", entity: customer.name, before: { blocked: customer.blocked }, after: { blocked: next } },
    );
    setDraft((prev) => ({ ...prev, blocked: next }));
    toast.success(next ? "Customer blocked" : "Customer unblocked");
  };

  return (
    <AdminShell trail={[{ label: "Customers", to: "/admin/customers" }, { label: customer.name }]}>
      <PageHeader
        eyebrow={customer.tier}
        title={customer.name}
        sub={customer.email}
        actions={
          can("customer.write") ? (
            <Button variant={customer.blocked ? "primary" : "danger"} onClick={() => setConfirmBlock(true)}>
              {customer.blocked ? "Unblock customer" : "Block customer"}
            </Button>
          ) : undefined
        }
      />

      <Grid cols={4}>
        <div className="card p-4">
          <p className="eyebrow">Orders</p>
          <p className="mt-2 text-[22px] font-semibold">{orders.length}</p>
        </div>
        <div className="card p-4">
          <p className="eyebrow">Lifetime spend</p>
          <p className="mt-2 text-[22px] font-semibold">{formatMoney(spendMinor, currency)}</p>
        </div>
        <div className="card p-4">
          <p className="eyebrow">Average order value</p>
          <p className="mt-2 text-[22px] font-semibold">{formatMoney(aov, currency)}</p>
        </div>
        <div className="card p-4">
          <p className="eyebrow">Last order</p>
          <p className="mt-2 text-[22px] font-semibold">{lastOrder ? formatDate(lastOrder.placedAt) : "None yet"}</p>
        </div>
      </Grid>

      <Panel title="Profile" description="Edit contact details, tier and consent.">
        <Grid cols={2}>
          <TextField label="Full name" value={draft.name ?? ""} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} disabled={!can("customer.write")} />
          <TextField label="Email" type="email" value={draft.email ?? ""} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} disabled={!can("customer.write")} />
          <TextField label="Phone" value={draft.phone ?? ""} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} disabled={!can("customer.write")} />
          <SelectField
            label="Tier"
            value={draft.tier ?? "New"}
            onChange={(e) => setDraft((p) => ({ ...p, tier: e.target.value as Customer["tier"] }))}
            options={[{ value: "New", label: "New" }, { value: "Returning", label: "Returning" }, { value: "VIP", label: "VIP" }]}
            disabled={!can("customer.write")}
          />
          <TextField label="Country" value={draft.country ?? ""} onChange={(e) => setDraft((p) => ({ ...p, country: e.target.value }))} disabled={!can("customer.write")} />
          <TextField label="City" value={draft.city ?? ""} onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value }))} disabled={!can("customer.write")} />
        </Grid>
        <div className="mt-4">
          <TextField
            label="Tags (comma separated)"
            value={(draft.tags ?? []).join(", ")}
            onChange={(e) => setDraft((p) => ({ ...p, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) }))}
            disabled={!can("customer.write")}
          />
        </div>
        <div className="mt-4">
          <TextArea label="Internal notes" value={draft.notes ?? ""} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} disabled={!can("customer.write")} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Toggle label="Marketing consent" on={Boolean(draft.marketing)} onChange={(v) => setDraft((p) => ({ ...p, marketing: v }))} disabled={!can("customer.write")} />
          <Toggle label="Email verified" on={Boolean(draft.emailVerified)} onChange={(v) => setDraft((p) => ({ ...p, emailVerified: v }))} disabled={!can("customer.write")} />
          <Toggle label="Phone verified" on={Boolean(draft.phoneVerified)} onChange={(v) => setDraft((p) => ({ ...p, phoneVerified: v }))} disabled={!can("customer.write")} />
        </div>
      </Panel>

      <Panel
        title="Address book"
        description="The first address is treated as the default for checkout."
        actions={
          can("customer.write") ? (
            <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => { setAddrIndex(null); setAddrDraft(emptyAddress()); setAddrOpen(true); }}>
              Add address
            </Button>
          ) : undefined
        }
      >
        {customer.addresses.length === 0 ? (
          <EmptyState title="No addresses saved" body="This customer has not saved an address yet." />
        ) : (
          <ul className="space-y-2">
            {customer.addresses.map((a, i) => (
              <li key={i} className="flex flex-wrap items-start justify-between gap-3 rounded-[10px] border border-line p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[13px] font-medium">
                    {a.name}
                    {i === 0 ? <StatusPill tone="blue">Default</StatusPill> : null}
                  </p>
                  <p className="text-[12px] text-muted">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.postcode}, {a.country}
                  </p>
                  <p className="text-[12px] text-muted">{a.phone}</p>
                </div>
                {can("customer.write") ? (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {i !== 0 ? (
                      <Button size="sm" icon={<Star className="size-3.5" />} onClick={() => saveAddresses([customer.addresses[i]!, ...customer.addresses.filter((_, x) => x !== i)], "customer.address.default")}>
                        Make default
                      </Button>
                    ) : null}
                    <Button size="sm" onClick={() => { setAddrIndex(i); setAddrDraft(a); setAddrOpen(true); }}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} onClick={() => saveAddresses(customer.addresses.filter((_, x) => x !== i), "customer.address.remove")}>
                      Remove
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Order history" description="Every order placed by this customer.">
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" />
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2 first:pt-0">
                <div className="min-w-0">
                  <p className="tnum truncate text-[13px]">{o.number}</p>
                  <p className="text-[12px] text-muted">{formatDate(o.placedAt)} · {o.status}</p>
                </div>
                <span className="tnum shrink-0 text-[13px]">{formatMoney(orderTotal(o), currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Grid cols={2}>
        <Panel title="Wishlist">
          {wishlistProducts.length === 0 ? (
            <EmptyState title="Wishlist is empty" />
          ) : (
            <KeyValue rows={wishlistProducts.map((p) => ({ label: p.name, value: formatMoney(p.price, currency) }))} />
          )}
        </Panel>
        <Panel title="Reviews written">
          {reviews.length === 0 ? (
            <EmptyState title="No reviews yet" />
          ) : (
            <KeyValue rows={reviews.map((r) => ({ label: `${r.title} · ${r.rating}★`, value: r.state }))} />
          )}
        </Panel>
      </Grid>

      <Panel title="Messages sent" description="Contact-form submissions from this customer.">
        {messages.length === 0 ? (
          <EmptyState title="No messages yet" />
        ) : (
          <KeyValue rows={messages.map((m) => ({ label: `${m.subject} · ${formatDate(m.at)}`, value: m.state }))} />
        )}
      </Panel>

      {can("customer.write") ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} /> : null}

      <ConfirmDialog
        open={confirmBlock}
        onOpenChange={setConfirmBlock}
        title={customer.blocked ? "Unblock this customer?" : "Block this customer?"}
        body={customer.blocked ? "They will regain the ability to place orders and sign in." : "They will be prevented from placing new orders or signing in."}
        confirmLabel={customer.blocked ? "Unblock" : "Block customer"}
        destructive={!customer.blocked}
        onConfirm={toggleBlocked}
      />

      <Sheet
        open={addrOpen}
        onOpenChange={setAddrOpen}
        title={addrIndex === null ? "Add address" : "Edit address"}
        footer={
          <>
            <Button onClick={() => setAddrOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                const next = [...customer.addresses];
                if (addrIndex === null) next.push(addrDraft);
                else next[addrIndex] = addrDraft;
                saveAddresses(next, addrIndex === null ? "customer.address.add" : "customer.address.update");
                setAddrOpen(false);
              }}
            >
              Save address
            </Button>
          </>
        }
      >
        <Grid cols={2}>
          <TextField label="Name" value={addrDraft.name} onChange={(e) => setAddrDraft((p) => ({ ...p, name: e.target.value }))} />
          <TextField label="Phone" value={addrDraft.phone} onChange={(e) => setAddrDraft((p) => ({ ...p, phone: e.target.value }))} />
          <TextField label="Address line 1" value={addrDraft.line1} onChange={(e) => setAddrDraft((p) => ({ ...p, line1: e.target.value }))} />
          <TextField label="Address line 2" value={addrDraft.line2 ?? ""} onChange={(e) => setAddrDraft((p) => ({ ...p, line2: e.target.value }))} />
          <TextField label="City" value={addrDraft.city} onChange={(e) => setAddrDraft((p) => ({ ...p, city: e.target.value }))} />
          <TextField label="Postcode" value={addrDraft.postcode} onChange={(e) => setAddrDraft((p) => ({ ...p, postcode: e.target.value }))} />
          <TextField label="Country" value={addrDraft.country} onChange={(e) => setAddrDraft((p) => ({ ...p, country: e.target.value }))} />
        </Grid>
      </Sheet>
    </AdminShell>
  );
}
