import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import { Grid, MoneyField, Panel, PageHeader, SaveBar, TextField, Toggle, useDraft } from "@/components/velora/kit";
import { useAdminState, useCan, useCurrency, mutateSettings, nextOrderNumber } from "@/lib/velora/store";

export const Route = createFileRoute("/admin/settings/orders")({
  head: () => ({
    meta: [
      { title: "Order rules — Velora Admin" },
      { name: "description", content: "Order numbering, invoice prefix, auto-cancel/complete windows, returns window and checkout rules." },
      { property: "og:title", content: "Order rules — Velora Admin" },
      { property: "og:description", content: "Order numbering and lifecycle rules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrderRulesSettings,
});

function OrderRulesSettings() {
  const state = useAdminState();
  const can = useCan();
  const currency = useCurrency();
  const canWrite = can("settings.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.settings.orderRules);

  const save = () => {
    const before = state.settings.orderRules;
    mutateSettings(
      (s) => {
        s.settings.orderRules = draft;
      },
      { action: "settings.orders.update", entity: "Order rules", before, after: draft },
    );
    commit();
    toast.success("Order rules saved");
  };

  return (
    <AdminShell trail={[{ label: "Settings", to: "/admin/settings/store" }, { label: "Orders" }]}>
      <PageHeader eyebrow="Settings" title="Order rules" sub="Numbering, invoicing and the lifecycle timers that keep orders moving." />

      <Panel title="Next order number preview" description="Computed from the current order history and these settings">
        <p className="tnum text-[20px] font-semibold">{nextOrderNumber()}</p>
      </Panel>

      <Grid cols={3}>
        <TextField label="Order prefix" value={draft.prefix} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, prefix: e.target.value })} />
        <TextField
          label="Starting number"
          type="number"
          value={draft.start}
          disabled={!canWrite}
          onChange={(e) => setDraft({ ...draft, start: Number(e.target.value) })}
        />
        <TextField
          label="Number padding"
          type="number"
          value={draft.padding}
          disabled={!canWrite}
          onChange={(e) => setDraft({ ...draft, padding: Number(e.target.value) })}
        />
        <TextField label="Invoice prefix" value={draft.invoicePrefix} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, invoicePrefix: e.target.value })} />
      </Grid>

      <Panel title="Lifecycle timers">
        <Grid cols={3}>
          <TextField
            label="Auto-cancel unpaid orders after (hours)"
            type="number"
            value={draft.autoCancelHours}
            disabled={!canWrite}
            onChange={(e) => setDraft({ ...draft, autoCancelHours: Number(e.target.value) })}
          />
          <TextField
            label="Auto-complete delivered orders after (days)"
            type="number"
            value={draft.autoCompleteDays}
            disabled={!canWrite}
            onChange={(e) => setDraft({ ...draft, autoCompleteDays: Number(e.target.value) })}
          />
          <TextField
            label="Returns window (days)"
            type="number"
            value={draft.returnsDays}
            disabled={!canWrite}
            onChange={(e) => setDraft({ ...draft, returnsDays: Number(e.target.value) })}
          />
        </Grid>
      </Panel>

      <Panel title="Checkout rules">
        <div className="space-y-4">
          <MoneyField
            label="Minimum order value"
            valueMinor={draft.minOrderMinor}
            currency={currency}
            disabled={!canWrite}
            onChangeMinor={(m) => setDraft({ ...draft, minOrderMinor: m })}
          />
          <Toggle label="Allow guest checkout" on={draft.guestCheckout} disabled={!canWrite} onChange={(v) => setDraft({ ...draft, guestCheckout: v })} />
          <Toggle
            label="Require terms acceptance"
            on={draft.requireTerms}
            disabled={!canWrite}
            onChange={(v) => setDraft({ ...draft, requireTerms: v })}
          />
          <Toggle label="Reset numbering yearly" on={draft.yearlyReset} disabled={!canWrite} onChange={(v) => setDraft({ ...draft, yearlyReset: v })} />
        </div>
      </Panel>

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} /> : null}
    </AdminShell>
  );
}
