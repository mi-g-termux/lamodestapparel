import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  Grid,
  Panel,
  PageHeader,
  SaveBar,
  SelectField,
  TextField,
  Toggle,
  useDraft,
} from "@/components/velora/kit";
import { useAdminState, useCan, mutateSettings } from "@/lib/velora/store";
import { formatMoney } from "@/lib/velora/money";

export const Route = createFileRoute("/admin/settings/currency")({
  head: () => ({
    meta: [
      { title: "Currency — Velora Admin" },
      { name: "description", content: "Base currency, formatting rules and the active currency table with exchange rates." },
      { property: "og:title", content: "Currency — Velora Admin" },
      { property: "og:description", content: "Base currency, formatting and exchange rates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CurrencySettings,
});

function CurrencySettings() {
  const state = useAdminState();
  const can = useCan();
  const canWrite = can("settings.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.settings.currency);

  const previewAmounts = [999, 149999, 4999999];
  const previewConfig = useMemo(
    () => ({
      code: draft.base,
      symbol: draft.symbol,
      decimals: draft.decimals,
      position: draft.position,
      thousands: draft.thousands,
      decimalSep: draft.decimalSep,
    }),
    [draft.base, draft.symbol, draft.decimals, draft.position, draft.thousands, draft.decimalSep],
  );

  const save = () => {
    const before = state.settings.currency;
    mutateSettings(
      (s) => {
        s.settings.currency = draft;
      },
      { action: "settings.currency.update", entity: "Currency", before, after: draft },
    );
    commit();
    toast.success("Currency settings saved");
  };

  return (
    <AdminShell trail={[{ label: "Settings", to: "/admin/settings/store" }, { label: "Currency" }]}>
      <PageHeader eyebrow="Settings" title="Currency" sub="Base currency, number formatting and active currencies with their exchange rates." />

      <Grid cols={2}>
        <Panel title="Base currency">
          <div className="space-y-4">
            <TextField
              label="Base code"
              value={draft.base}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, base: e.target.value.toUpperCase() })}
            />
            <TextField
              label="Symbol"
              value={draft.symbol}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, symbol: e.target.value })}
            />
            <Grid cols={2}>
              <TextField
                label="Decimals"
                type="number"
                min={0}
                max={4}
                value={draft.decimals}
                disabled={!canWrite}
                onChange={(e) => setDraft({ ...draft, decimals: Number(e.target.value) })}
              />
              <SelectField
                label="Symbol position"
                value={draft.position}
                disabled={!canWrite}
                options={[
                  { value: "before", label: "Before amount" },
                  { value: "after", label: "After amount" },
                ]}
                onChange={(e) => setDraft({ ...draft, position: e.target.value as "before" | "after" })}
              />
            </Grid>
            <Grid cols={2}>
              <TextField
                label="Thousands separator"
                value={draft.thousands}
                disabled={!canWrite}
                onChange={(e) => setDraft({ ...draft, thousands: e.target.value })}
              />
              <TextField
                label="Decimal separator"
                value={draft.decimalSep}
                disabled={!canWrite}
                onChange={(e) => setDraft({ ...draft, decimalSep: e.target.value })}
              />
            </Grid>
            <SelectField
              label="Rounding"
              value={draft.rounding}
              disabled={!canWrite}
              options={[
                { value: "none", label: "No rounding" },
                { value: "nearest", label: "Nearest unit" },
                { value: "up", label: "Round up" },
              ]}
              onChange={(e) => setDraft({ ...draft, rounding: e.target.value as "none" | "nearest" | "up" })}
            />
          </div>
        </Panel>

        <Panel title="Live formatting preview" description="Recalculates as you edit the settings on the left">
          <ul className="space-y-2">
            {previewAmounts.map((m) => (
              <li key={m} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2">
                <span className="text-[12px] text-muted">Minor units: {m}</span>
                <span className="tnum text-[15px] font-semibold">{formatMoney(m, previewConfig)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </Grid>

      <Panel
        title="Active currencies"
        description="Shoppers can choose from these on the storefront; rates are relative to the base currency"
        actions={
          canWrite ? (
            <Button
              size="sm"
              icon={<Plus className="size-3.5" />}
              onClick={() =>
                setDraft({
                  ...draft,
                  active: [...draft.active, { code: "", symbol: "", rate: 1, manual: true }],
                })
              }
            >
              Add currency
            </Button>
          ) : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[0.12em] text-muted uppercase">
                <th className="px-2 py-2">Code</th>
                <th className="px-2 py-2">Symbol</th>
                <th className="px-2 py-2">Rate vs base</th>
                <th className="px-2 py-2">Manual rate</th>
                <th className="px-2 py-2">Preview</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {draft.active.map((row, i) => (
                <tr key={i} className="border-b border-line/70 last:border-0">
                  <td className="px-2 py-2">
                    <input
                      className="field w-24"
                      value={row.code}
                      disabled={!canWrite}
                      onChange={(e) => {
                        const next = [...draft.active];
                        next[i] = { ...next[i]!, code: e.target.value.toUpperCase() };
                        setDraft({ ...draft, active: next });
                      }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="field w-20"
                      value={row.symbol}
                      disabled={!canWrite}
                      onChange={(e) => {
                        const next = [...draft.active];
                        next[i] = { ...next[i]!, symbol: e.target.value };
                        setDraft({ ...draft, active: next });
                      }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="field tnum w-28"
                      type="number"
                      step="0.0001"
                      value={row.rate}
                      disabled={!canWrite}
                      onChange={(e) => {
                        const next = [...draft.active];
                        next[i] = { ...next[i]!, rate: Number(e.target.value) };
                        setDraft({ ...draft, active: next });
                      }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Toggle
                      label=""
                      on={row.manual}
                      disabled={!canWrite}
                      onChange={(v) => {
                        const next = [...draft.active];
                        next[i] = { ...next[i]!, manual: v };
                        setDraft({ ...draft, active: next });
                      }}
                    />
                  </td>
                  <td className="tnum px-2 py-2 text-[13px] text-muted">
                    {formatMoney(149999 * row.rate, { ...previewConfig, code: row.code, symbol: row.symbol || previewConfig.symbol })}
                  </td>
                  <td className="px-2 py-2">
                    {canWrite ? (
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<Trash2 className="size-3.5" />}
                        onClick={() => setDraft({ ...draft, active: draft.active.filter((_, idx) => idx !== i) })}
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
      </Panel>

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} /> : null}
    </AdminShell>
  );
}
