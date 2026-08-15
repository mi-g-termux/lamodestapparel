import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  ConfirmDialog,
  KeyValue,
  Money,
  MoneyField,
  PageHeader,
  Panel,
  Segmented,
  SelectField,
  Sheet,
  StatusPill,
  TextArea,
  TextField,
  Timeline,
  Toggle,
  formatDateTime,
} from "@/components/velora/kit";
import { mutate, orderTotal, useAdminState, useCan, useCurrency } from "@/lib/velora/store";
import { formatMoney } from "@/lib/velora/money";
import { orderStatuses, orderStatusTone, paymentTone, type OrderStatus } from "@/lib/velora/status";

export const Route = createFileRoute("/admin/orders/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.id} — Velora Admin` },
      { name: "description", content: "Order detail: line items, totals, timeline, shipping and refunds." },
      { property: "og:title", content: "Order detail — Velora Admin" },
      { property: "og:description", content: "Order detail: line items, totals, timeline, shipping and refunds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const state = useAdminState();
  const currency = useCurrency();
  const can = useCan();
  const order = state.orders.find((o) => o.id === id);

  const [courier, setCourier] = useState(order?.courier ?? "");
  const [tracking, setTracking] = useState(order?.tracking ?? "");
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState<OrderStatus>(order?.status ?? "Pending");
  const [notify, setNotify] = useState(true);
  const [confirmAdvance, setConfirmAdvance] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [refundMode, setRefundMode] = useState<"full" | "partial">("full");
  const [refundMinor, setRefundMinor] = useState(0);

  const lineTotal = useMemo(() => order?.items.reduce((s, it) => s + it.unitPrice * it.qty, 0) ?? 0, [order]);

  if (!order) {
    return (
      <AdminShell trail={[{ label: "Orders", to: "/admin/orders" }, { label: "Not found" }]}>
        <PageHeader title="Order not found" sub="This order may have been removed." />
        <Link to="/admin/orders" className="text-[13px] text-gold hover:underline">
          Back to orders
        </Link>
      </AdminShell>
    );
  }

  const refundableMinor = orderTotal(order) - order.refundedMinor;
  const statusIndex = orderStatuses.indexOf(order.status);
  const advanceOptions = orderStatuses.filter((s) => s !== order.status);
  const refundAmount = refundMode === "full" ? refundableMinor : Math.min(refundMinor, refundableMinor);

  const saveShipping = () => {
    mutate(
      (draft) => {
        const o = draft.orders.find((x) => x.id === id)!;
        o.courier = courier || null;
        o.tracking = tracking || null;
        o.history.push({ at: new Date().toISOString(), label: "Courier & tracking updated", actor: "You" });
      },
      { action: "order.shipping.update", entity: order.number, before: { courier: order.courier, tracking: order.tracking }, after: { courier, tracking } },
    );
  };

  const addNote = () => {
    if (!note.trim()) return;
    mutate(
      (draft) => {
        const o = draft.orders.find((x) => x.id === id)!;
        o.notes.push({ at: new Date().toISOString(), text: note.trim(), actor: "You" });
      },
      { action: "order.note.add", entity: order.number, after: { note: note.trim() } },
    );
    setNote("");
  };

  const advanceStatus = () => {
    mutate(
      (draft) => {
        const o = draft.orders.find((x) => x.id === id)!;
        const before = o.status;
        o.status = nextStatus;
        o.history.push({
          at: new Date().toISOString(),
          label: `Status changed from ${before} to ${nextStatus}`,
          actor: "You",
          notified: notify,
        });
      },
      { action: "order.status.update", entity: order.number, before: { status: order.status }, after: { status: nextStatus, notified: notify } },
    );
  };

  const applyRefund = () => {
    const amount = refundAmount;
    if (amount <= 0) return;
    mutate(
      (draft) => {
        const o = draft.orders.find((x) => x.id === id)!;
        o.refundedMinor += amount;
        o.payment = o.refundedMinor >= orderTotal(o) ? "Refunded" : "Partially refunded";
        o.history.push({ at: new Date().toISOString(), label: `Refunded ${formatMoney(amount, currency)}`, actor: "You" });
      },
      { action: "order.refund", entity: order.number, before: { refundedMinor: order.refundedMinor }, after: { amount } },
    );
    setRefundMinor(0);
    setRefundOpen(false);
  };

  return (
    <AdminShell trail={[{ label: "Orders", to: "/admin/orders" }, { label: order.number }]}>
      <PageHeader
        eyebrow={formatDateTime(order.placedAt)}
        title={`Order ${order.number}`}
        sub={`${order.customerName} · ${order.email}${order.isFirstOrder ? " · First order" : ""}`}
        actions={
          <>
            <StatusPill tone={orderStatusTone[order.status]}>{order.status}</StatusPill>
            <StatusPill tone={paymentTone[order.payment]}>{order.payment}</StatusPill>
            <Button onClick={() => window.print()}>Print summary</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Line items" description="Immutable snapshot captured at the time of purchase.">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] tracking-[0.12em] text-muted uppercase">
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Variant</th>
                    <th className="py-2 pr-3 text-right">Qty</th>
                    <th className="py-2 pr-3 text-right">Unit price</th>
                    <th className="py-2 text-right">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, i) => (
                    <tr key={`${it.variantId}-${i}`} className="border-b border-line/70 last:border-0">
                      <td className="py-2 pr-3">{it.name}</td>
                      <td className="tnum py-2 pr-3 text-muted">{it.sku}</td>
                      <td className="py-2 pr-3 text-muted">{it.variantLabel}</td>
                      <td className="tnum py-2 pr-3 text-right">{it.qty}</td>
                      <td className="tnum py-2 pr-3 text-right">
                        <Money minor={it.unitPrice} currency={currency} />
                      </td>
                      <td className="tnum py-2 text-right">
                        <Money minor={it.unitPrice * it.qty} currency={currency} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Totals">
            <KeyValue
              rows={[
                { label: "Items", value: formatMoney(lineTotal, currency) },
                { label: "Discount", value: `−${formatMoney(order.discountMinor, currency)}` },
                { label: "Shipping", value: formatMoney(order.shippingMinor, currency) },
                { label: "Tax", value: formatMoney(order.taxMinor, currency) },
                { label: "Refunded", value: `−${formatMoney(order.refundedMinor, currency)}` },
                {
                  label: "Grand total",
                  value: <span className="font-semibold">{formatMoney(orderTotal(order) - order.refundedMinor, currency)}</span>,
                },
              ]}
            />
            {order.invoiceNumber ? (
              <p className="mt-3 text-[12px] text-muted">
                Invoice number: <span className="tnum">{order.invoiceNumber}</span>
              </p>
            ) : null}
          </Panel>

          <Panel title="Timeline">
            <Timeline
              items={order.history.map((h) => ({
                at: h.at,
                label: h.notified ? `${h.label} · customer notified` : h.label,
                actor: h.actor,
                note: h.note,
              }))}
            />
          </Panel>

          <Panel title="Internal notes">
            <div className="space-y-3">
              {order.notes.length > 0 ? (
                <ul className="space-y-2">
                  {order.notes.map((n, i) => (
                    <li key={i} className="rounded-[10px] border border-line px-3 py-2 text-[13px]">
                      <p>{n.text}</p>
                      <p className="mt-1 text-[12px] text-muted">
                        {formatDateTime(n.at)} · {n.actor}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">No internal notes yet.</p>
              )}
              <TextArea label="Add a note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              <Button onClick={addNote} disabled={!note.trim()}>
                Add note
              </Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Customer">
            <KeyValue
              rows={[
                { label: "Name", value: order.customerName },
                { label: "Email", value: order.email },
                { label: "Phone", value: order.phone },
                { label: "Channel", value: order.channel },
                { label: "Device", value: order.device },
                { label: "Country/city", value: `${order.country} · ${order.city}` },
                { label: "Coupon", value: order.couponCode ?? "None" },
              ]}
            />
          </Panel>

          <Panel title="Shipping address">
            <p className="text-[13px] leading-relaxed">
              {order.shippingAddress.name}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.postcode}
              <br />
              {order.shippingAddress.country}
              <br />
              {order.shippingAddress.phone}
            </p>
          </Panel>

          <Panel title="Billing address">
            <p className="text-[13px] leading-relaxed">
              {order.billingAddress.name}
              <br />
              {order.billingAddress.line1}
              {order.billingAddress.line2 ? `, ${order.billingAddress.line2}` : ""}
              <br />
              {order.billingAddress.city}, {order.billingAddress.postcode}
              <br />
              {order.billingAddress.country}
              <br />
              {order.billingAddress.phone}
            </p>
          </Panel>

          {can("shipment.manage") ? (
            <Panel title="Courier & tracking">
              <div className="space-y-3">
                <TextField label="Courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. DHL Express" />
                <TextField label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                <Button variant="primary" onClick={saveShipping}>
                  Save shipping details
                </Button>
              </div>
            </Panel>
          ) : null}

          {can("order.status.update") ? (
            <Panel title="Advance status" description={`Current stage ${statusIndex + 1} of ${orderStatuses.length}.`}>
              <div className="space-y-3">
                <SelectField
                  label="New status"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                  options={advanceOptions.map((s) => ({ value: s, label: s }))}
                />
                <Toggle on={notify} onChange={setNotify} label="Notify customer" description="Sends the status update email." />
                <Button variant="primary" onClick={() => setConfirmAdvance(true)}>
                  Update status
                </Button>
              </div>
            </Panel>
          ) : null}

          {can("order.refund") ? (
            <Panel title="Refund" description={`${formatMoney(refundableMinor, currency)} available to refund.`}>
              <Button variant="danger" onClick={() => setRefundOpen(true)} disabled={refundableMinor <= 0}>
                Issue refund
              </Button>
            </Panel>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmAdvance}
        onOpenChange={setConfirmAdvance}
        title={`Change status to “${nextStatus}”?`}
        body={notify ? "The customer will be emailed about this change." : "The customer will not be notified."}
        confirmLabel="Update status"
        onConfirm={advanceStatus}
      />

      <Sheet
        open={refundOpen}
        onOpenChange={setRefundOpen}
        title="Issue a refund"
        description={`${formatMoney(refundableMinor, currency)} is available to refund on this order.`}
        footer={
          <>
            <Button onClick={() => setRefundOpen(false)}>Cancel</Button>
            <Button variant="danger" disabled={refundAmount <= 0} onClick={() => setConfirmRefund(true)}>
              Issue refund
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Segmented
            label="Refund type"
            value={refundMode}
            onChange={setRefundMode}
            options={[
              { value: "full", label: "Full refund" },
              { value: "partial", label: "Partial refund" },
            ]}
          />
          {refundMode === "partial" ? (
            <MoneyField label="Refund amount" valueMinor={refundMinor} onChangeMinor={setRefundMinor} currency={currency} helper={`Up to ${formatMoney(refundableMinor, currency)}`} />
          ) : (
            <p className="text-[13px] text-muted">The full remaining balance of {formatMoney(refundableMinor, currency)} will be refunded.</p>
          )}
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmRefund}
        onOpenChange={setConfirmRefund}
        title={`Refund ${formatMoney(refundAmount, currency)}?`}
        body="This updates the payment status and cannot be undone from here."
        confirmLabel="Confirm refund"
        destructive
        onConfirm={applyRefund}
      />
    </AdminShell>
  );
}
