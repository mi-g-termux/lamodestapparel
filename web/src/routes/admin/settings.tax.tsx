import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { useAdminState, useCan, useCurrency, mutateSettings } from "@/lib/velora/store";
import { formatMoney } from "@/lib/velora/money";
import type { TaxRule } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/settings/tax")({
  head: () => ({
    meta: [
      { title: "Tax — Velora Admin" },
      { name: "description", content: "Tax classes, country/region rules and whether displayed prices include tax." },
      { property: "og:title", content: "Tax — Velora Admin" },
      { property: "og:description", content: "Tax classes and rules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TaxSettings,
});

let ruleSeq = 0;

function TaxSettings() {
  const state = useAdminState();
  const can = useCan();
  const currency = useCurrency();
  const canWrite = can("settings.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.settings.tax);
  const [newClass, setNewClass] = useState("");
  const [exampleAmount, setExampleAmount] = useState(10000);
  const [exampleRuleId, setExampleRuleId] = useState<string | undefined>(draft.rules[0]?.id);

  const exampleRule = draft.rules.find((r) => r.id === exampleRuleId) ?? draft.rules[0];
  const worked = useMemo(() => {
    if (!exampleRule) return null;
    const rate = exampleRule.rateBps / 10000;
    if (exampleRule.inclusive || draft.pricesIncludeTax) {
      const net = Math.round(exampleAmount / (1 + rate));
      return { gross: exampleAmount, net, tax: exampleAmount - net };
    }
    const tax = Math.round(exampleAmount * rate);
    return { gross: exampleAmount + tax, net: exampleAmount, tax };
  }, [exampleAmount, exampleRule, draft.pricesIncludeTax]);

  const updateRule = (id: string, patch: Partial<TaxRule>) => {
    setDraft({ ...draft, rules: draft.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  };

  const save = () => {
    const before = state.settings.tax;
    mutateSettings(
      (s) => {
        s.settings.tax = draft;
      },
      { action: "settings.tax.update", entity: "Tax", before, after: draft },
    );
    commit();
    toast.success("Tax settings saved");
  };

  return (
    <AdminShell trail={[{ label: "Settings", to: "/admin/settings/store" }, { label: "Tax" }]}>
      <PageHeader eyebrow="Settings" title="Tax" sub="Tax classes, per-country rules expressed as percentages, and inclusive/exclusive pricing." />

      <Panel title="Pricing">
        <Toggle
          label="Displayed prices include tax"
          description="When on, catalogue prices are treated as tax-inclusive at checkout"
          on={draft.pricesIncludeTax}
          disabled={!canWrite}
          onChange={(v) => setDraft({ ...draft, pricesIncludeTax: v })}
        />
      </Panel>

      <Panel
        title="Tax classes"
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <input className="field" placeholder="New class" value={newClass} onChange={(e) => setNewClass(e.target.value)} />
              <Button
                size="sm"
                icon={<Plus className="size-3.5" />}
                onClick={() => {
                  if (!newClass.trim() || draft.classes.includes(newClass.trim())) return;
                  setDraft({ ...draft, classes: [...draft.classes, newClass.trim()] });
                  setNewClass("");
                }}
              >
                Add
              </Button>
            </div>
          ) : undefined
        }
      >
        <ul className="flex flex-wrap gap-2">
          {draft.classes.map((cls) => (
            <li key={cls} className="pill flex items-center gap-2 bg-bg-subtle text-ink">
              {cls}
              {canWrite ? (
                <button
                  aria-label={`Remove ${cls}`}
                  onClick={() => setDraft({ ...draft, classes: draft.classes.filter((c) => c !== cls) })}
                >
                  <Trash2 className="size-3" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Tax rules"
        description="Rates are stored as basis points and shown as a percentage"
        actions={
          canWrite ? (
            <Button
              size="sm"
              icon={<Plus className="size-3.5" />}
              onClick={() => {
                ruleSeq += 1;
                setDraft({
                  ...draft,
                  rules: [
                    ...draft.rules,
                    { id: `new-rule-${ruleSeq}`, country: "", region: "*", rateBps: 0, inclusive: false, taxClass: draft.classes[0] ?? "Standard" },
                  ],
                });
              }}
            >
              Add rule
            </Button>
          ) : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[0.12em] text-muted uppercase">
                <th className="px-2 py-2">Country</th>
                <th className="px-2 py-2">Region</th>
                <th className="px-2 py-2">Rate</th>
                <th className="px-2 py-2">Inclusive</th>
                <th className="px-2 py-2">Tax class</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {draft.rules.map((rule) => (
                <tr key={rule.id} className="border-b border-line/70 last:border-0">
                  <td className="px-2 py-2">
                    <input className="field w-40" value={rule.country} disabled={!canWrite} onChange={(e) => updateRule(rule.id, { country: e.target.value })} />
                  </td>
                  <td className="px-2 py-2">
                    <input className="field w-24" value={rule.region} disabled={!canWrite} onChange={(e) => updateRule(rule.id, { region: e.target.value })} />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        className="field tnum w-20"
                        value={(rule.rateBps / 100).toFixed(2)}
                        disabled={!canWrite}
                        onChange={(e) => updateRule(rule.id, { rateBps: Math.round(Number(e.target.value) * 100) })}
                      />
                      <span className="text-muted">%</span>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <Toggle label="" on={rule.inclusive} disabled={!canWrite} onChange={(v) => updateRule(rule.id, { inclusive: v })} />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="field w-32"
                      value={rule.taxClass}
                      disabled={!canWrite}
                      onChange={(e) => updateRule(rule.id, { taxClass: e.target.value })}
                    >
                      {draft.classes.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    {canWrite ? (
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<Trash2 className="size-3.5" />}
                        onClick={() => setDraft({ ...draft, rules: draft.rules.filter((r) => r.id !== rule.id) })}
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

      <Panel title="Worked example">
        <Grid cols={3}>
          <TextField
            label="Amount (major units)"
            type="number"
            value={exampleAmount / 100}
            onChange={(e) => setExampleAmount(Math.round(Number(e.target.value) * 100))}
          />
          <SelectField
            label="Rule"
            value={exampleRuleId ?? ""}
            onChange={(e) => setExampleRuleId(e.target.value)}
            options={draft.rules.map((r) => ({ value: r.id, label: `${r.country || "Untitled"} · ${r.region}` }))}
          />
        </Grid>
        {worked ? (
          <p className="mt-3 text-[13px] text-muted">
            Net {formatMoney(worked.net, currency)} + tax {formatMoney(worked.tax, currency)} = gross{" "}
            <span className="font-semibold text-ink">{formatMoney(worked.gross, currency)}</span>
          </p>
        ) : (
          <p className="mt-3 text-[13px] text-muted">Add a tax rule to see a worked example.</p>
        )}
      </Panel>

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} /> : null}
    </AdminShell>
  );
}
