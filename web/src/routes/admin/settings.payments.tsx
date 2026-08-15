import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  CopyField,
  Grid,
  MaskedSecretField,
  MoneyField,
  Panel,
  PageHeader,
  SaveBar,
  Segmented,
  TextField,
  Toggle,
  formatDateTime,
  useDraft,
  useStepUp,
} from "@/components/velora/kit";
import { useAdminState, useCan, useCurrency, mutateSettings } from "@/lib/velora/store";
import type { PaymentProvider } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/settings/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Velora Admin" },
      { name: "description", content: "Payment providers, credentials, supported countries and currencies, limits and webhook endpoints." },
      { property: "og:title", content: "Payments — Velora Admin" },
      { property: "og:description", content: "Configure payment providers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaymentsSettings,
});

function PaymentsSettings() {
  const state = useAdminState();
  const can = useCan();
  const currency = useCurrency();
  const stepUp = useStepUp();
  const canRead = can("settings.payments.read") || can("settings.payments.write");
  const canWrite = can("settings.payments.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.settings.payments);

  if (!canRead) {
    return (
      <AdminShell trail={[{ label: "Settings", to: "/admin/settings/store" }, { label: "Payments" }]}>
        <PageHeader eyebrow="Settings" title="Payments" sub="You don't have permission to view payment settings." />
      </AdminShell>
    );
  }

  const update = (id: string, patch: Partial<PaymentProvider>) => {
    setDraft(draft.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = draft.findIndex((p) => p.id === id);
    const target = idx + dir;
    if (target < 0 || target >= draft.length) return;
    const copy = [...draft];
    const [item] = copy.splice(idx, 1);
    copy.splice(target, 0, item!);
    setDraft(copy.map((p, i) => ({ ...p, sort: i })));
  };

  const doSave = () => {
    const before = state.settings.payments;
    mutateSettings(
      (s) => {
        s.settings.payments = draft;
      },
      { action: "settings.payments.update", entity: "Payments", before, after: draft },
    );
    commit();
    toast.success("Payment settings saved");
  };

  const save = () => {
    const hasLiveCreds = draft.some((p) => p.mode === "live" && p.enabled);
    if (hasLiveCreds) {
      stepUp.request("Confirm your password before saving live payment credentials.", doSave);
    } else {
      doSave();
    }
  };

  return (
    <AdminShell trail={[{ label: "Settings", to: "/admin/settings/store" }, { label: "Payments" }]}>
      <PageHeader eyebrow="Settings" title="Payments" sub="Providers, credentials, eligibility and limits. Reorder to change checkout priority." />

      <div className="space-y-4">
        {draft
          .slice()
          .sort((a, b) => a.sort - b.sort)
          .map((p, i, arr) => (
            <Panel
              key={p.id}
              title={p.name}
              description={`${p.enabled ? "Enabled" : "Disabled"} · ${p.mode} mode${p.lastEventAt ? ` · last event ${formatDateTime(p.lastEventAt)}` : ""}`}
              actions={
                canWrite ? (
                  <div className="flex items-center gap-2">
                    <Button size="sm" disabled={i === 0} onClick={() => move(p.id, -1)}>
                      Move up
                    </Button>
                    <Button size="sm" disabled={i === arr.length - 1} onClick={() => move(p.id, 1)}>
                      Move down
                    </Button>
                    <Toggle label="Enabled" on={p.enabled} onChange={(v) => update(p.id, { enabled: v })} />
                  </div>
                ) : undefined
              }
            >
              <Grid cols={3}>
                <TextField label="Display name" value={p.displayName} disabled={!canWrite} onChange={(e) => update(p.id, { displayName: e.target.value })} />
                <Segmented
                  label="Mode"
                  value={p.mode}
                  onChange={(v) => canWrite && update(p.id, { mode: v })}
                  options={[
                    { value: "test", label: "Test" },
                    { value: "live", label: "Live" },
                  ]}
                />
                <TextField
                  label="Surcharge (bps)"
                  type="number"
                  value={p.surchargeBps}
                  disabled={!canWrite}
                  onChange={(e) => update(p.id, { surchargeBps: Number(e.target.value) })}
                />
              </Grid>

              <Grid cols={2} className="mt-4">
                <MoneyField
                  label="Minimum amount"
                  valueMinor={p.minMinor}
                  currency={currency}
                  disabled={!canWrite}
                  onChangeMinor={(m) => update(p.id, { minMinor: m })}
                />
                <MoneyField
                  label="Maximum amount"
                  valueMinor={p.maxMinor ?? 0}
                  currency={currency}
                  disabled={!canWrite}
                  onChangeMinor={(m) => update(p.id, { maxMinor: m || null })}
                />
              </Grid>

              <div className="mt-4">
                <p className="eyebrow mb-2">Credentials</p>
                <div className="space-y-3">
                  {Object.entries(p.credentials).map(([key, value]) => (
                    <MaskedSecretField
                      key={key}
                      label={key}
                      value={value}
                      onReplace={(next) => {
                        if (!canWrite) return;
                        const apply = () => update(p.id, { credentials: { ...p.credentials, [key]: next } });
                        if (p.mode === "live") stepUp.request(`Confirm your password to replace the ${p.name} ${key}.`, apply);
                        else apply();
                      }}
                    />
                  ))}
                  {Object.keys(p.credentials).length === 0 ? (
                    <p className="text-[13px] text-muted">No credentials required for this provider.</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4">
                <p className="eyebrow mb-2">Countries</p>
                <div className="flex flex-wrap gap-2">
                  {state.settings.countries.map((c) => {
                    const active = p.countries.includes(c.name);
                    return (
                      <button
                        key={c.code}
                        type="button"
                        disabled={!canWrite}
                        onClick={() => update(p.id, { countries: active ? p.countries.filter((n) => n !== c.name) : [...p.countries, c.name] })}
                        className={`pill ${active ? "bg-ink text-surface" : "bg-bg-subtle text-muted"}`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <p className="eyebrow mb-2">Currencies</p>
                <div className="flex flex-wrap gap-2">
                  {state.settings.currency.active.map((c) => {
                    const active = p.currencies.includes(c.code);
                    return (
                      <button
                        key={c.code}
                        type="button"
                        disabled={!canWrite}
                        onClick={() => update(p.id, { currencies: active ? p.currencies.filter((n) => n !== c.code) : [...p.currencies, c.code] })}
                        className={`pill ${active ? "bg-ink text-surface" : "bg-bg-subtle text-muted"}`}
                      >
                        {c.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 max-w-lg">
                <CopyField label="Webhook URL" value={p.webhookUrl} />
              </div>
            </Panel>
          ))}
      </div>

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} /> : null}
    </AdminShell>
  );
}
