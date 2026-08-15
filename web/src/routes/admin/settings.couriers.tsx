import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  Grid,
  MaskedSecretField,
  Panel,
  PageHeader,
  SaveBar,
  TextField,
  Toggle,
  formatDateTime,
  useDraft,
} from "@/components/velora/kit";
import { useAdminState, useCan, mutateSettings } from "@/lib/velora/store";
import type { Courier } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/settings/couriers")({
  head: () => ({
    meta: [
      { title: "Couriers — Velora Admin" },
      { name: "description", content: "Courier integrations, credentials, coverage and shipment automation." },
      { property: "og:title", content: "Couriers — Velora Admin" },
      { property: "og:description", content: "Courier integrations and automation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CouriersSettings,
});

function CouriersSettings() {
  const state = useAdminState();
  const can = useCan();
  const canWrite = can("settings.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.settings.couriers);

  const update = (id: string, patch: Partial<Courier>) => setDraft(draft.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const verify = (id: string) => {
    update(id, { lastVerifiedAt: new Date().toISOString() });
    toast.success("Connection verified");
  };

  const save = () => {
    const before = state.settings.couriers;
    mutateSettings(
      (s) => {
        s.settings.couriers = draft;
      },
      { action: "settings.couriers.update", entity: "Couriers", before, after: draft },
    );
    commit();
    toast.success("Courier settings saved");
  };

  return (
    <AdminShell trail={[{ label: "Settings", to: "/admin/settings/store" }, { label: "Couriers" }]}>
      <PageHeader eyebrow="Settings" title="Couriers" sub="Carrier integrations used to create shipping labels and track deliveries." />

      <div className="space-y-4">
        {draft.map((c) => (
          <Panel
            key={c.id}
            title={c.name}
            description={c.lastVerifiedAt ? `Last verified ${formatDateTime(c.lastVerifiedAt)}` : "Not yet verified"}
            actions={
              canWrite ? (
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => verify(c.id)}>
                    Verify connection
                  </Button>
                  <Toggle label="Enabled" on={c.enabled} onChange={(v) => update(c.id, { enabled: v })} />
                </div>
              ) : undefined
            }
          >
            <Grid cols={2}>
              <Toggle
                label="Auto-create shipment"
                description="Create a shipment automatically once an order is packed"
                on={c.autoCreateShipment}
                disabled={!canWrite}
                onChange={(v) => update(c.id, { autoCreateShipment: v })}
              />
              <Toggle
                label="Auto-schedule pickup"
                on={c.autoPickup}
                disabled={!canWrite}
                onChange={(v) => update(c.id, { autoPickup: v })}
              />
            </Grid>
            <TextField
              label="Failover order"
              type="number"
              className="mt-4 max-w-[200px]"
              value={c.failoverOrder}
              disabled={!canWrite}
              onChange={(e) => update(c.id, { failoverOrder: Number(e.target.value) })}
            />
            <div className="mt-4">
              <p className="eyebrow mb-2">Credentials</p>
              <div className="space-y-3">
                {Object.entries(c.credentials).map(([key, value]) => (
                  <MaskedSecretField
                    key={key}
                    label={key}
                    value={value}
                    onReplace={(next) => canWrite && update(c.id, { credentials: { ...c.credentials, [key]: next } })}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4">
              <p className="eyebrow mb-2">Countries</p>
              <div className="flex flex-wrap gap-2">
                {state.settings.countries.map((country) => {
                  const active = c.countries.includes(country.name);
                  return (
                    <button
                      key={country.code}
                      type="button"
                      disabled={!canWrite}
                      onClick={() =>
                        update(c.id, {
                          countries: active ? c.countries.filter((n) => n !== country.name) : [...c.countries, country.name],
                        })
                      }
                      className={`pill ${active ? "bg-ink text-surface" : "bg-bg-subtle text-muted"}`}
                    >
                      {country.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>
        ))}
      </div>

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} /> : null}
    </AdminShell>
  );
}
