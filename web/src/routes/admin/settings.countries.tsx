import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  EmptyState,
  Grid,
  Panel,
  PageHeader,
  SaveBar,
  TextField,
  Toggle,
  useDraft,
} from "@/components/velora/kit";
import { useAdminState, useCan, mutateSettings } from "@/lib/velora/store";
import type { CountryConfig } from "@/lib/velora/types";

export const Route = createFileRoute("/admin/settings/countries")({
  head: () => ({
    meta: [
      { title: "Countries — Velora Admin" },
      { name: "description", content: "Shipping and billing eligibility, dial codes, postcode and phone patterns, and cities per country." },
      { property: "og:title", content: "Countries — Velora Admin" },
      { property: "og:description", content: "Country eligibility, dial codes and city lists." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CountriesSettings,
});

const emptyCountry: CountryConfig = {
  code: "",
  name: "",
  shipping: true,
  billing: true,
  cities: [],
  postcodePattern: "",
  phonePattern: "",
  dialCode: "",
};

function CountriesSettings() {
  const state = useAdminState();
  const can = useCan();
  const canWrite = can("settings.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.settings.countries);
  const [query, setQuery] = useState("");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [newCity, setNewCity] = useState("");

  const filtered = draft.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase().includes(query.toLowerCase()),
  );

  const update = (code: string, patch: Partial<CountryConfig>) => {
    setDraft(draft.map((c) => (c.code === code ? { ...c, ...patch } : c)));
  };

  const save = () => {
    const before = state.settings.countries;
    mutateSettings(
      (s) => {
        s.settings.countries = draft;
      },
      { action: "settings.countries.update", entity: "Countries", before, after: draft },
    );
    commit();
    toast.success("Countries saved");
  };

  const open = draft.find((c) => c.code === openCode) ?? null;

  return (
    <AdminShell trail={[{ label: "Settings", to: "/admin/settings/store" }, { label: "Countries" }]}>
      <PageHeader
        eyebrow="Settings"
        title="Countries"
        sub="Countries available for shipping and billing, with dial codes, validation patterns and city lists."
        actions={
          canWrite ? (
            <Button
              size="sm"
              icon={<Plus className="size-3.5" />}
              onClick={() => {
                setDraft([...draft, { ...emptyCountry, code: `NEW${draft.length}` }]);
              }}
            >
              Add country
            </Button>
          ) : undefined
        }
      />

      <div className="max-w-xs">
        <TextField label="Search" placeholder="Search by name or code" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No countries match" body="Try a different search term." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[11px] tracking-[0.12em] text-muted uppercase">
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Dial code</th>
                  <th className="px-3 py-2">Shipping</th>
                  <th className="px-3 py-2">Billing</th>
                  <th className="px-3 py-2">Cities</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.code} className="border-b border-line/70 last:border-0">
                    <td className="px-3 py-2">
                      <input
                        className="field w-20"
                        value={c.code}
                        disabled={!canWrite}
                        onChange={(e) => update(c.code, { code: e.target.value.toUpperCase() })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input className="field" value={c.name} disabled={!canWrite} onChange={(e) => update(c.code, { name: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <input className="field w-24" value={c.dialCode} disabled={!canWrite} onChange={(e) => update(c.code, { dialCode: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Toggle label="" on={c.shipping} disabled={!canWrite} onChange={(v) => update(c.code, { shipping: v })} />
                    </td>
                    <td className="px-3 py-2">
                      <Toggle label="" on={c.billing} disabled={!canWrite} onChange={(v) => update(c.code, { billing: v })} />
                    </td>
                    <td className="px-3 py-2 text-[13px] text-muted">{c.cities.length} cities</td>
                    <td className="flex gap-2 px-3 py-2">
                      <Button size="sm" onClick={() => setOpenCode(c.code)}>
                        Edit
                      </Button>
                      {canWrite ? (
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<Trash2 className="size-3.5" />}
                          onClick={() => setDraft(draft.filter((x) => x.code !== c.code))}
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
        </div>
      )}

      {open ? (
        <Panel
          title={`Editing ${open.name || open.code}`}
          description="Postcode/phone validation patterns and the list of cities offered at checkout"
          actions={
            <Button size="sm" onClick={() => setOpenCode(null)}>
              Close
            </Button>
          }
        >
          <Grid cols={2}>
            <TextField
              label="Postcode pattern"
              helper="Regular expression used to validate postcodes at checkout"
              value={open.postcodePattern}
              disabled={!canWrite}
              onChange={(e) => update(open.code, { postcodePattern: e.target.value })}
            />
            <TextField
              label="Phone pattern"
              helper="Regular expression used to validate phone numbers at checkout"
              value={open.phonePattern}
              disabled={!canWrite}
              onChange={(e) => update(open.code, { phonePattern: e.target.value })}
            />
          </Grid>

          <div className="mt-4">
            <p className="eyebrow mb-2">Cities</p>
            <ul className="mb-3 flex flex-wrap gap-2">
              {open.cities.map((city) => (
                <li key={city} className="pill flex items-center gap-2 bg-bg-subtle text-ink">
                  {city}
                  {canWrite ? (
                    <button
                      aria-label={`Remove ${city}`}
                      onClick={() => update(open.code, { cities: open.cities.filter((c) => c !== city) })}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  ) : null}
                </li>
              ))}
              {open.cities.length === 0 ? <p className="text-[13px] text-muted">No cities added yet.</p> : null}
            </ul>
            {canWrite ? (
              <div className="flex max-w-sm gap-2">
                <input
                  className="field"
                  placeholder="Add a city"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCity.trim()) {
                      update(open.code, { cities: [...open.cities, newCity.trim()] });
                      setNewCity("");
                    }
                  }}
                />
                <Button
                  size="sm"
                  icon={<Plus className="size-3.5" />}
                  onClick={() => {
                    if (!newCity.trim()) return;
                    update(open.code, { cities: [...open.cities, newCity.trim()] });
                    setNewCity("");
                  }}
                >
                  Add
                </Button>
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} /> : null}
    </AdminShell>
  );
}
