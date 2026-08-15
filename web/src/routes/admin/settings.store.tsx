import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  Grid,
  Panel,
  PageHeader,
  SaveBar,
  TextArea,
  TextField,
  useDraft,
} from "@/components/velora/kit";
import { useAdminState, useCan, mutateSettings } from "@/lib/velora/store";

export const Route = createFileRoute("/admin/settings/store")({
  head: () => ({
    meta: [
      { title: "Store details — Velora Admin" },
      { name: "description", content: "Legal name, contact details, hours, address and social links for the storefront footer and legal pages." },
      { property: "og:title", content: "Store details — Velora Admin" },
      { property: "og:description", content: "Legal name, contact details, hours, address and social links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StoreSettings,
});

function StoreSettings() {
  const state = useAdminState();
  const can = useCan();
  const canWrite = can("settings.write");
  const { draft, setDraft, dirty, reset, commit } = useDraft(state.settings.store);

  const save = () => {
    const before = state.settings.store;
    mutateSettings(
      (s) => {
        s.settings.store = draft;
      },
      { action: "settings.store.update", entity: "Store details", before, after: draft },
    );
    commit();
    toast.success("Store details saved");
  };

  return (
    <AdminShell trail={[{ label: "Settings", to: "/admin/settings/store" }, { label: "Store details" }]}>
      <PageHeader
        eyebrow="Settings"
        title="Store details"
        sub="Legal identity, contact details and social links used across the storefront and legal pages."
      />

      <Grid cols={2}>
        <Panel title="Identity">
          <div className="space-y-4">
            <TextField
              label="Legal name"
              value={draft.legalName}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, legalName: e.target.value })}
            />
            <TextField
              label="Display name"
              helper="Shown on the storefront header and email footer"
              value={draft.displayName}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
            />
            <TextField
              label="VAT number"
              value={draft.vatNumber}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, vatNumber: e.target.value })}
            />
            <TextField
              label="Registration number"
              value={draft.registrationNumber}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, registrationNumber: e.target.value })}
            />
          </div>
        </Panel>

        <Panel title="Contact">
          <div className="space-y-4">
            <TextField
              label="Support email"
              type="email"
              value={draft.supportEmail}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, supportEmail: e.target.value })}
            />
            <TextField
              label="Phone"
              value={draft.phone}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
            <TextField
              label="WhatsApp"
              value={draft.whatsapp}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })}
            />
            <TextField
              label="Support hours"
              value={draft.hours}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, hours: e.target.value })}
            />
          </div>
        </Panel>

        <Panel title="Registered address" description="Used on invoices and legal pages">
          <div className="space-y-4">
            <TextField
              label="Name"
              value={draft.address.name}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, address: { ...draft.address, name: e.target.value } })}
            />
            <TextField
              label="Address line 1"
              value={draft.address.line1}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, address: { ...draft.address, line1: e.target.value } })}
            />
            <TextField
              label="Address line 2"
              value={draft.address.line2 ?? ""}
              disabled={!canWrite}
              onChange={(e) => setDraft({ ...draft, address: { ...draft.address, line2: e.target.value } })}
            />
            <Grid cols={2}>
              <TextField
                label="City"
                value={draft.address.city}
                disabled={!canWrite}
                onChange={(e) => setDraft({ ...draft, address: { ...draft.address, city: e.target.value } })}
              />
              <TextField
                label="Postcode"
                value={draft.address.postcode}
                disabled={!canWrite}
                onChange={(e) => setDraft({ ...draft, address: { ...draft.address, postcode: e.target.value } })}
              />
            </Grid>
            <Grid cols={2}>
              <TextField
                label="Country"
                value={draft.address.country}
                disabled={!canWrite}
                onChange={(e) => setDraft({ ...draft, address: { ...draft.address, country: e.target.value } })}
              />
              <TextField
                label="Phone"
                value={draft.address.phone}
                disabled={!canWrite}
                onChange={(e) => setDraft({ ...draft, address: { ...draft.address, phone: e.target.value } })}
              />
            </Grid>
          </div>
        </Panel>

        <Panel
          title="Social links"
          description="Displayed in the storefront footer"
          actions={
            canWrite ? (
              <Button
                size="sm"
                icon={<Plus className="size-3.5" />}
                onClick={() => setDraft({ ...draft, social: [...draft.social, { platform: "", url: "" }] })}
              >
                Add link
              </Button>
            ) : undefined
          }
        >
          {draft.social.length === 0 ? (
            <p className="text-[13px] text-muted">No social links yet.</p>
          ) : (
            <div className="space-y-3">
              {draft.social.map((row, i) => (
                <div key={i} className="flex items-end gap-2">
                  <TextField
                    label="Platform"
                    className="w-40"
                    value={row.platform}
                    disabled={!canWrite}
                    onChange={(e) => {
                      const next = [...draft.social];
                      next[i] = { ...next[i]!, platform: e.target.value };
                      setDraft({ ...draft, social: next });
                    }}
                  />
                  <TextField
                    label="URL"
                    className="flex-1"
                    value={row.url}
                    disabled={!canWrite}
                    onChange={(e) => {
                      const next = [...draft.social];
                      next[i] = { ...next[i]!, url: e.target.value };
                      setDraft({ ...draft, social: next });
                    }}
                  />
                  {canWrite ? (
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 className="size-3.5" />}
                      onClick={() => setDraft({ ...draft, social: draft.social.filter((_, idx) => idx !== i) })}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </Grid>

      {canWrite ? <SaveBar dirty={dirty} onSave={save} onDiscard={reset} /> : null}
    </AdminShell>
  );
}
