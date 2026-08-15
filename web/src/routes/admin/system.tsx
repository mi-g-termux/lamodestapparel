import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Database, Download, RefreshCcw, ShieldAlert, Trash2, Upload, Webhook } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Grid,
  HealthDot,
  InlineBanner,
  KeyValue,
  PageHeader,
  Panel,
  Sheet,
  StatusPill,
  Tabs,
  formatDateTime,
  relativeTime,
} from "@/components/velora/kit";
import { useAdminState, useCan, mutate, readState, resetStore } from "@/lib/velora/store";
import { downloadText } from "@/lib/velora/csv";
import type { Backup, Job, WebhookEvent } from "@/lib/velora/types";
import type { Tone } from "@/lib/velora/status";

export const Route = createFileRoute("/admin/system")({
  head: () => ({
    meta: [
      { title: "System health — Velora Admin" },
      { name: "description", content: "Backups, webhooks, background jobs and platform diagnostics." },
      { property: "og:title", content: "System health — Velora Admin" },
      { property: "og:description", content: "Manage backups, replay webhooks, retry jobs and review diagnostics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SystemPage,
});

type Tab = "backups" | "webhooks" | "jobs" | "diagnostics";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

function SystemPage() {
  const state = useAdminState();
  const can = useCan();
  const [tab, setTab] = useState<Tab>("backups");

  if (!can("system.manage")) {
    return (
      <AdminShell trail={[{ label: "System health" }]}>
        <PageHeader title="System health" />
        <EmptyState title="No access" body="You don't have permission to manage system health." icon={<ShieldAlert className="size-6" />} />
      </AdminShell>
    );
  }

  return (
    <AdminShell trail={[{ label: "System health" }]}>
      <PageHeader
        eyebrow="System"
        title="System health"
        sub="Backups, webhook delivery, background jobs and platform diagnostics — plus the demo data reset."
        tabs={
          <Tabs
            value={tab}
            onChange={(v) => setTab(v as Tab)}
            items={[
              { value: "backups", label: "Backups", count: state.backups.length },
              { value: "webhooks", label: "Webhooks", count: state.webhooks.length },
              { value: "jobs", label: "Jobs", count: state.jobs.length },
              { value: "diagnostics", label: "Diagnostics" },
            ]}
          />
        }
      />

      {tab === "backups" ? <BackupsTab /> : null}
      {tab === "webhooks" ? <WebhooksTab /> : null}
      {tab === "jobs" ? <JobsTab /> : null}
      {tab === "diagnostics" ? <DiagnosticsTab /> : null}
    </AdminShell>
  );
}

/* ── Backups ─────────────────────────────────────────────────────────────── */
function BackupsTab() {
  const state = useAdminState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const createBackup = () => {
    const snapshot = JSON.stringify(readState());
    const backup: Backup = {
      id: `bk-${Date.now()}`,
      at: new Date().toISOString(),
      bytes: new Blob([snapshot]).size,
      integrity: "Verified",
      destination: "Local export",
    };
    mutate(
      (draft) => {
        draft.backups = [backup, ...draft.backups];
      },
      { action: "backup.create", entity: backup.id, after: { bytes: backup.bytes } },
    );
    toast.success("Backup created");
  };

  const verify = (backup: Backup) => {
    mutate(
      (draft) => {
        const b = draft.backups.find((x) => x.id === backup.id)!;
        b.integrity = "Verified";
      },
      { action: "backup.verify", entity: backup.id },
    );
    toast.success("Backup verified");
  };

  const downloadStore = () => {
    downloadText(`velora-store-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(readState(), null, 2), "application/json");
    toast.success("Store downloaded");
  };

  const onFilePicked = (file: File | null) => {
    if (!file) return;
    setPendingFile(file);
    setRestoreOpen(true);
  };

  const doRestore = async () => {
    if (!pendingFile) return;
    try {
      const text = await pendingFile.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || !("products" in parsed) || !("orders" in parsed)) {
        toast.error("That file doesn't look like a valid Velora store export.");
        return;
      }
      mutate(
        (draft) => {
          Object.assign(draft, parsed);
        },
        { action: "backup.restore", entity: pendingFile.name },
      );
      toast.success("Store restored from file");
    } catch {
      toast.error("Could not parse that file as JSON.");
    } finally {
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <Panel
        title="Backups"
        description="Snapshots of the whole admin store."
        actions={
          <>
            <Button icon={<Database className="size-3.5" />} onClick={createBackup}>
              Create backup
            </Button>
            <Button icon={<Download className="size-3.5" />} onClick={downloadStore}>
              Download store JSON
            </Button>
            <Button icon={<Upload className="size-3.5" />} onClick={() => fileRef.current?.click()}>
              Restore from file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
            />
          </>
        }
      >
        {state.backups.length === 0 ? (
          <EmptyState title="No backups yet" body="Create one to snapshot the current store." />
        ) : (
          <ul className="divide-y divide-line">
            {state.backups.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{formatDateTime(b.at)}</p>
                  <p className="text-[12px] text-muted">
                    {formatBytes(b.bytes)} · {b.destination}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={b.integrity === "Verified" ? "green" : "amber"}>{b.integrity}</StatusPill>
                  {b.integrity !== "Verified" ? (
                    <Button size="sm" onClick={() => verify(b)}>
                      Verify
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={restoreOpen}
        onOpenChange={(v) => {
          setRestoreOpen(v);
          if (!v) {
            setPendingFile(null);
            if (fileRef.current) fileRef.current.value = "";
          }
        }}
        title="Restore store from file"
        body={`This will overwrite the current store with the contents of "${pendingFile?.name ?? "the selected file"}". This cannot be undone.`}
        confirmLabel="Restore"
        destructive
        typedConfirm="RESTORE"
        onConfirm={() => void doRestore()}
      />
    </>
  );
}

/* ── Webhooks ────────────────────────────────────────────────────────────── */
function WebhooksTab() {
  const state = useAdminState();
  const [viewing, setViewing] = useState<WebhookEvent | null>(null);

  const replay = (event: WebhookEvent) => {
    const result: WebhookEvent["result"] = event.signature === "Valid" ? "Processed" : "Failed";
    mutate(
      (draft) => {
        draft.webhooks = [
          { ...event, id: `wh-${Date.now()}`, at: new Date().toISOString(), result },
          ...draft.webhooks,
        ];
      },
      { action: "webhook.replay", entity: `${event.source}:${event.event}`, before: { result: event.result }, after: { result } },
    );
    toast.success(result === "Processed" ? "Webhook replayed and processed" : "Webhook replayed but failed again");
  };

  return (
    <>
      <Panel title="Incoming webhooks" description="Events received from payment providers and couriers.">
        {state.webhooks.length === 0 ? (
          <EmptyState title="No webhook activity" icon={<Webhook className="size-6" />} />
        ) : (
          <ul className="divide-y divide-line">
            {state.webhooks.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">
                    {w.source} · {w.event}
                  </p>
                  <p className="text-[12px] text-muted">{relativeTime(w.at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={w.signature === "Valid" ? "green" : "red"}>{w.signature}</StatusPill>
                  <StatusPill tone={w.result === "Processed" ? "green" : "amber"}>{w.result}</StatusPill>
                  <Button size="sm" onClick={() => setViewing(w)}>
                    Payload
                  </Button>
                  <Button size="sm" onClick={() => replay(w)}>
                    Replay
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Sheet
        open={Boolean(viewing)}
        onOpenChange={(v) => !v && setViewing(null)}
        title={viewing ? `${viewing.source} · ${viewing.event}` : ""}
        description={viewing ? `${formatDateTime(viewing.at)} · signature ${viewing.signature}` : undefined}
        wide
        side="right"
      >
        <pre className="max-h-[70vh] overflow-auto rounded-[10px] border border-line bg-bg-subtle p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
          {viewing?.payload ?? ""}
        </pre>
      </Sheet>
    </>
  );
}

/* ── Jobs ────────────────────────────────────────────────────────────────── */
const jobTone: Record<Job["state"], Tone> = {
  Pending: "grey",
  Running: "blue",
  Failed: "red",
  "Dead letter": "amber",
  Done: "green",
};

function JobsTab() {
  const state = useAdminState();

  const retry = (job: Job) => {
    mutate(
      (draft) => {
        const j = draft.jobs.find((x) => x.id === job.id)!;
        j.state = "Pending";
        j.attempts += 1;
        j.error = null;
      },
      { action: "job.retry", entity: job.name, before: { state: job.state }, after: { state: "Pending" } },
    );
    toast.success(`${job.name} queued for retry`);
  };

  const deadLetter = (job: Job) => {
    mutate(
      (draft) => {
        const j = draft.jobs.find((x) => x.id === job.id)!;
        j.state = "Dead letter";
      },
      { action: "job.deadLetter", entity: job.name, before: { state: job.state }, after: { state: "Dead letter" } },
    );
    toast.success(`${job.name} moved to dead letter`);
  };

  return (
    <Panel title="Background jobs" description="Queue state for asynchronous work such as emails and shipment sync.">
      {state.jobs.length === 0 ? (
        <EmptyState title="No jobs queued" />
      ) : (
        <ul className="divide-y divide-line">
          {state.jobs.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{j.name}</p>
                <p className="text-[12px] text-muted">
                  {relativeTime(j.at)} · {j.attempts} attempt{j.attempts === 1 ? "" : "s"}
                  {j.error ? ` · ${j.error}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill tone={jobTone[j.state]}>{j.state}</StatusPill>
                {(j.state === "Failed" || j.state === "Dead letter") ? (
                  <Button size="sm" icon={<RefreshCcw className="size-3.5" />} onClick={() => retry(j)}>
                    Retry
                  </Button>
                ) : null}
                {j.state === "Failed" ? (
                  <Button size="sm" variant="danger" onClick={() => deadLetter(j)}>
                    Dead-letter
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ── Diagnostics ─────────────────────────────────────────────────────────── */
function DiagnosticsTab() {
  const state = useAdminState();
  const [resetOpen, setResetOpen] = useState(false);

  const counts = useMemo(
    () => ({
      products: state.products.length,
      orders: state.orders.length,
      customers: state.customers.length,
      staff: state.staff.length,
      media: state.media.length,
    }),
    [state],
  );

  const doReset = () => {
    resetStore();
    mutate(() => {}, { action: "system.resetDemoData", entity: "store" });
    toast.success("Demo data reset");
  };

  return (
    <div className="space-y-4">
      <Panel title="Diagnostics">
        <div className="space-y-2">
          <HealthDot
            ok={state.settings.smtp.configured}
            label="SMTP configured"
            since={state.settings.smtp.lastTestAt ? relativeTime(state.settings.smtp.lastTestAt) : undefined}
          />
          <HealthDot ok={state.settings.payments.some((p) => p.enabled && p.mode === "live")} label="Payment providers live" />
          <HealthDot
            ok={state.settings.couriers.some((c) => c.enabled && c.lastVerifiedAt)}
            label="Courier verification"
            since={state.settings.couriers[0]?.lastVerifiedAt ? relativeTime(state.settings.couriers[0]!.lastVerifiedAt!) : undefined}
          />
          <HealthDot ok={!state.settings.maintenance.on} label="Maintenance mode off" />
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <KeyValue
            rows={[
              { label: "Environment", value: <StatusPill tone={state.settings.environment === "production" ? "green" : "amber"}>{state.settings.environment}</StatusPill> },
              { label: "Settings version", value: state.settings.settingsVersion },
              { label: "Products", value: counts.products },
              { label: "Orders", value: counts.orders },
              { label: "Customers", value: counts.customers },
              { label: "Staff", value: counts.staff },
              { label: "Media assets", value: counts.media },
            ]}
          />
        </div>
      </Panel>

      <Panel title="Danger zone" className="border-bad/30">
        <InlineBanner
          tone="warn"
          title="Reset demo data"
          body="Wipes all changes and restores the original seed data for the whole store. This cannot be undone."
          action={
            <Button variant="danger" icon={<Trash2 className="size-3.5" />} onClick={() => setResetOpen(true)}>
              Reset demo data
            </Button>
          }
        />
      </Panel>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset demo data"
        body="This replaces every product, order, customer and setting with the original seed data. This cannot be undone."
        confirmLabel="Reset everything"
        destructive
        typedConfirm="RESET"
        onConfirm={doReset}
      />
    </div>
  );
}
