import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  Grid,
  InlineBanner,
  MoneyField,
  Panel,
  PageHeader,
  SaveBar,
  TextField,
  Toggle,
  useDraft,
} from "@/components/velora/kit";
import { useAdminState, useCan, useCurrency, mutateSettings } from "@/lib/velora/store";
import type { ShippingRate, ShippingZone } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/settings/shipping")({
  head: () => ({
    meta: [
      { title: "Shipping — Velora Admin" },
      { name: "description", content: "Free-shipping threshold, handling fee, order cutoff and shipping zones with rates and ETAs." },
      { property: "og:title", content: "Shipping — Velora Admin" },
      { property: "og:description", content: "Shipping zones, rates and thresholds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ShippingSettings,
});

let rateSeq = 0;
let zoneSeq = 0;

function emptyRate(): ShippingRate {
  rateSeq += 1;
  return { id: `new-rate-${rateSeq}`, label: "", calc: "Flat", amountMinor: 0, etaMin: 1, etaMax: 3, cod: false };
}

function emptyZone(): ShippingZone {
  zoneSeq += 1;
  return { id: `new-zone-${zoneSeq}`, name: "", countries: [], priority: 99, rates: [] };
}

function ShippingSettings() {
  const state = useAdminState();
  const can = useCan();
  const currency = useCurrency();
  const canWrite = can("settings.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.settings.shipping);

  const countryOptions = state.settings.countries;

  const duplicateCountries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const z of draft.zones) for (const c of z.countries) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].filter(([, n]) => n > 1).map(([c]) => c);
  }, [draft.zones]);

  const uncovered = useMemo(() => {
    const covered = new Set(draft.zones.flatMap((z) => z.countries));
    return countryOptions.filter((c) => c.shipping && !covered.has(c.name)).map((c) => c.name);
  }, [draft.zones, countryOptions]);

  const updateZone = (id: string, patch: Partial<ShippingZone>) => {
    setDraft({ ...draft, zones: draft.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) });
  };

  const updateRate = (zoneId: string, rateId: string, patch: Partial<ShippingRate>) => {
    setDraft({
      ...draft,
      zones: draft.zones.map((z) =>
        z.id === zoneId ? { ...z, rates: z.rates.map((r) => (r.id === rateId ? { ...r, ...patch } : r)) } : z,
      ),
    });
  };

  const save = () => {
    const before = state.settings.shipping;
    mutateSettings(
      (s) => {
        s.settings.shipping = draft;
      },
      { action: "settings.shipping.update", entity: "Shipping", before, after: draft },
    );
    commit();
    toast.success("Shipping settings saved");
  };

  return (
    <AdminShell trail={[{ label: "Settings", to: "/admin/settings/store" }, { label: "Shipping" }]}>
      <PageHeader eyebrow="Settings" title="Shipping" sub="Global thresholds plus per-zone rates, ETAs and cash-on-delivery availability." />

      <Grid cols={3}>
        <MoneyField
          label="Free shipping over"
          valueMinor={draft.freeOverMinor}
          currency={currency}
          disabled={!canWrite}
          onChangeMinor={(m) => setDraft({ ...draft, freeOverMinor: m })}
        />
        <MoneyField
          label="Handling fee"
          valueMinor={draft.handlingMinor}
          currency={currency}
          disabled={!canWrite}
          onChangeMinor={(m) => setDraft({ ...draft, handlingMinor: m })}
        />
        <TextField
          label="Order cutoff (local time)"
          value={draft.cutoff}
          disabled={!canWrite}
          onChange={(e) => setDraft({ ...draft, cutoff: e.target.value })}
        />
      </Grid>

      {duplicateCountries.length > 0 ? (
        <InlineBanner
          tone="warn"
          title="A country appears in more than one zone"
          body={`${duplicateCountries.join(", ")} — the storefront will use the first matching zone.`}
        />
      ) : null}
      {uncovered.length > 0 ? (
        <InlineBanner
          tone="warn"
          title="Shipping-enabled countries with no zone"
          body={`${uncovered.join(", ")} — shoppers there won't see a shipping rate.`}
        />
      ) : null}

      <div className="space-y-4">
        {draft.zones
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((zone) => (
            <Panel
              key={zone.id}
              title={zone.name || "Untitled zone"}
              description={`Priority ${zone.priority} · ${zone.rates.length} rate${zone.rates.length === 1 ? "" : "s"}`}
              actions={
                canWrite ? (
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 className="size-3.5" />}
                    onClick={() => setDraft({ ...draft, zones: draft.zones.filter((z) => z.id !== zone.id) })}
                  >
                    Remove zone
                  </Button>
                ) : undefined
              }
            >
              <Grid cols={3}>
                <TextField label="Zone name" value={zone.name} disabled={!canWrite} onChange={(e) => updateZone(zone.id, { name: e.target.value })} />
                <TextField
                  label="Priority"
                  type="number"
                  value={zone.priority}
                  disabled={!canWrite}
                  onChange={(e) => updateZone(zone.id, { priority: Number(e.target.value) })}
                />
              </Grid>

              <div className="mt-3">
                <p className="eyebrow mb-2">Countries in this zone</p>
                <div className="flex flex-wrap gap-2">
                  {countryOptions.map((c) => {
                    const active = zone.countries.includes(c.name);
                    return (
                      <button
                        key={c.code}
                        type="button"
                        disabled={!canWrite}
                        onClick={() =>
                          updateZone(zone.id, {
                            countries: active ? zone.countries.filter((n) => n !== c.name) : [...zone.countries, c.name],
                          })
                        }
                        className={`pill ${active ? "bg-ink text-surface" : "bg-bg-subtle text-muted"}`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-[11px] tracking-[0.12em] text-muted uppercase">
                      <th className="px-2 py-2">Label</th>
                      <th className="px-2 py-2">Calc type</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">ETA (days)</th>
                      <th className="px-2 py-2">COD</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {zone.rates.map((rate) => (
                      <tr key={rate.id} className="border-b border-line/70 last:border-0">
                        <td className="px-2 py-2">
                          <input
                            className="field w-36"
                            value={rate.label}
                            disabled={!canWrite}
                            onChange={(e) => updateRate(zone.id, rate.id, { label: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            className="field w-36"
                            value={rate.calc}
                            disabled={!canWrite}
                            onChange={(e) => updateRate(zone.id, rate.id, { calc: e.target.value as ShippingRate["calc"] })}
                          >
                            {["Flat", "Weight tier", "Price tier", "Free over", "Live rate"].map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <MoneyField
                            label=""
                            valueMinor={rate.amountMinor}
                            currency={currency}
                            disabled={!canWrite}
                            onChangeMinor={(m) => updateRate(zone.id, rate.id, { amountMinor: m })}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              className="field tnum w-16"
                              value={rate.etaMin}
                              disabled={!canWrite}
                              onChange={(e) => updateRate(zone.id, rate.id, { etaMin: Number(e.target.value) })}
                            />
                            <span className="text-muted">–</span>
                            <input
                              type="number"
                              className="field tnum w-16"
                              value={rate.etaMax}
                              disabled={!canWrite}
                              onChange={(e) => updateRate(zone.id, rate.id, { etaMax: Number(e.target.value) })}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <Toggle label="" on={rate.cod} disabled={!canWrite} onChange={(v) => updateRate(zone.id, rate.id, { cod: v })} />
                        </td>
                        <td className="px-2 py-2">
                          {canWrite ? (
                            <Button
                              size="sm"
                              variant="danger"
                              icon={<Trash2 className="size-3.5" />}
                              onClick={() => updateZone(zone.id, { rates: zone.rates.filter((r) => r.id !== rate.id) })}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {canWrite ? (
                <Button
                  size="sm"
                  className="mt-3"
                  icon={<Plus className="size-3.5" />}
                  onClick={() => updateZone(zone.id, { rates: [...zone.rates, emptyRate()] })}
                >
                  Add rate
                </Button>
              ) : null}
            </Panel>
          ))}
      </div>

      {canWrite ? (
        <Button icon={<Plus className="size-3.5" />} onClick={() => setDraft({ ...draft, zones: [...draft.zones, emptyZone()] })}>
          Add zone
        </Button>
      ) : null}

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} /> : null}
    </AdminShell>
  );
}
