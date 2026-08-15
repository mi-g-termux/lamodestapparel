import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { KeyRound, Plus, ShieldAlert, ShieldCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/velora/AdminShell";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Grid,
  InlineBanner,
  Panel,
  PageHeader,
  SelectField,
  Sheet,
  StatusPill,
  TextField,
  Toggle,
  formatDateTime,
  relativeTime,
} from "@/components/velora/kit";
import { DataTable, type Column } from "@/components/velora/DataTable";
import { useAdminState, useCan, useCurrentUser, mutate } from "@/lib/velora/store";
import { ROLES, permissionGroups, permissionsFor, rolePermissions, type Permission, type Role } from "@/lib/velora/permissions";
import type { StaffUser } from "@/lib/velora/types";
import type { Tone } from "@/lib/velora/status";

export const Route = createFileRoute("/admin/staff")({
  head: () => ({
    meta: [
      { title: "Staff & roles — Velora Admin" },
      { name: "description", content: "Manage staff accounts, roles, permission overrides and active sessions." },
      { property: "og:title", content: "Staff & roles — Velora Admin" },
      { property: "og:description", content: "Invite staff, edit roles, manage permission overrides and sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffPage,
});

const statusTone: Record<StaffUser["status"], Tone> = {
  Active: "green",
  Suspended: "red",
  Invited: "amber",
};

function ownerCount(staff: StaffUser[]) {
  return staff.filter((s) => s.role === "Owner" && s.status !== "Suspended").length;
}

function StaffPage() {
  const state = useAdminState();
  const can = useCan();
  const me = useCurrentUser();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [removing, setRemoving] = useState<StaffUser | null>(null);
  const [revoking, setRevoking] = useState<{ id: string; current: boolean } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.staff;
    return state.staff.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
  }, [state.staff, search]);

  if (!can("staff.manage")) {
    return (
      <AdminShell trail={[{ label: "Staff & roles" }]}>
        <PageHeader title="Staff & roles" />
        <EmptyState title="No access" body="You don't have permission to manage staff and roles." icon={<ShieldAlert className="size-6" />} />
      </AdminShell>
    );
  }

  const inviteUser = (name: string, email: string, role: Role) => {
    const id = `st-${Date.now()}`;
    mutate(
      (draft) => {
        draft.staff.push({
          id,
          name,
          email,
          role,
          status: "Invited",
          lastLogin: null,
          twoFactor: false,
          mustChangePassword: true,
          overrides: {},
          password: "changeme123",
          failedAttempts: 0,
          lockedUntil: null,
        });
      },
      { action: "staff.invite", entity: email, after: { name, email, role } },
    );
    toast.success(`Invitation created for ${email}`);
    setInviteOpen(false);
  };

  const updateRole = (user: StaffUser, role: Role) => {
    if (user.role === "Owner" && role !== "Owner" && ownerCount(state.staff) <= 1) {
      toast.error("Cannot demote the last Owner.");
      return;
    }
    mutate(
      (draft) => {
        const u = draft.staff.find((s) => s.id === user.id)!;
        u.role = role;
      },
      { action: "staff.role.update", entity: user.email, before: { role: user.role }, after: { role } },
    );
    toast.success(`${user.name}'s role updated to ${role}`);
  };

  const toggleSuspend = (user: StaffUser) => {
    if (user.status !== "Suspended" && user.role === "Owner" && ownerCount(state.staff) <= 1) {
      toast.error("Cannot suspend the last active Owner.");
      return;
    }
    const next = user.status === "Suspended" ? "Active" : "Suspended";
    mutate(
      (draft) => {
        const u = draft.staff.find((s) => s.id === user.id)!;
        u.status = next;
      },
      { action: "staff.status.update", entity: user.email, before: { status: user.status }, after: { status: next } },
    );
    toast.success(next === "Suspended" ? `${user.name} suspended` : `${user.name} restored`);
  };

  const forceReset = (user: StaffUser) => {
    mutate(
      (draft) => {
        const u = draft.staff.find((s) => s.id === user.id)!;
        u.mustChangePassword = true;
      },
      { action: "staff.password.forceReset", entity: user.email },
    );
    toast.success(`${user.name} must change their password at next sign-in`);
  };

  const toggleTwoFactor = (user: StaffUser) => {
    const next = !user.twoFactor;
    mutate(
      (draft) => {
        const u = draft.staff.find((s) => s.id === user.id)!;
        u.twoFactor = next;
      },
      { action: "staff.twoFactor.update", entity: user.email, before: { twoFactor: user.twoFactor }, after: { twoFactor: next } },
    );
    toast.success(next ? `Two-factor required for ${user.name}` : `Two-factor no longer required for ${user.name}`);
  };

  const removeUser = (user: StaffUser) => {
    if (user.role === "Owner" && ownerCount(state.staff) <= 1) {
      toast.error("Cannot remove the last Owner.");
      return;
    }
    mutate(
      (draft) => {
        draft.staff = draft.staff.filter((s) => s.id !== user.id);
        draft.sessions = draft.sessions.filter((s) => s.userId !== user.id);
      },
      { action: "staff.remove", entity: user.email, before: { name: user.name, role: user.role } },
    );
    toast.success(`${user.name} removed`);
  };

  const setOverride = (user: StaffUser, permission: Permission, value: boolean | undefined) => {
    mutate(
      (draft) => {
        const u = draft.staff.find((s) => s.id === user.id)!;
        const overrides = { ...u.overrides };
        if (value === undefined) delete overrides[permission];
        else overrides[permission] = value;
        u.overrides = overrides;
      },
      {
        action: "staff.permission.override",
        entity: user.email,
        before: { [permission]: user.overrides[permission] },
        after: { [permission]: value },
      },
    );
  };

  const revokeSession = (sessionId: string) => {
    const session = state.sessions.find((s) => s.id === sessionId);
    mutate(
      (draft) => {
        draft.sessions = draft.sessions.filter((s) => s.id !== sessionId);
      },
      { action: "session.revoke", entity: session?.userId ?? sessionId },
    );
    toast.success("Session revoked");
  };

  const columns: Column<StaffUser>[] = [
    { key: "name", header: "Name", value: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "email", header: "Email", value: (r) => r.email, render: (r) => <span className="text-muted">{r.email}</span> },
    { key: "role", header: "Role", value: (r) => r.role, render: (r) => <StatusPill tone="blue">{r.role}</StatusPill> },
    { key: "status", header: "Status", value: (r) => r.status, render: (r) => <StatusPill tone={statusTone[r.status]}>{r.status}</StatusPill> },
    {
      key: "lastLogin",
      header: "Last login",
      value: (r) => r.lastLogin ?? "",
      render: (r) => <span className="text-muted">{r.lastLogin ? relativeTime(r.lastLogin) : "Never"}</span>,
    },
    {
      key: "twoFactor",
      header: "2FA",
      value: (r) => (r.twoFactor ? 1 : 0),
      render: (r) => (r.twoFactor ? <StatusPill tone="green">Required</StatusPill> : <StatusPill tone="grey">Off</StatusPill>),
    },
    {
      key: "mustChangePassword",
      header: "Must change password",
      value: (r) => (r.mustChangePassword ? 1 : 0),
      render: (r) => (r.mustChangePassword ? <StatusPill tone="amber">Pending</StatusPill> : <span className="text-muted">—</span>),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" onClick={() => setEditing(r)}>
            Manage
          </Button>
        </div>
      ),
      align: "right",
    },
  ];

  return (
    <AdminShell trail={[{ label: "Staff & roles" }]}>
      <PageHeader
        eyebrow="System"
        title="Staff & roles"
        sub="Invite staff, manage roles and permission overrides, and keep tabs on active sessions."
        actions={
          <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setInviteOpen(true)}>
            Invite user
          </Button>
        }
      />

      <Panel title="Staff accounts" description={`${state.staff.length} accounts · ${ownerCount(state.staff)} active Owner(s)`}>
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id}
          caption="Staff accounts"
          search={{ value: search, onChange: setSearch, placeholder: "Search name, email or role" }}
          page={page}
          pageSize={10}
          onPage={setPage}
          csvName="staff"
          emptyTitle="No staff match your search"
        />
      </Panel>

      <Panel title="Permission matrix" description="Effective permissions per role. Overrides for an individual user are edited from Manage → Permission overrides.">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-line">
                <th className="px-3 py-2 text-[11px] tracking-[0.14em] text-muted uppercase">Permission</th>
                {ROLES.map((role) => (
                  <th key={role} className="px-3 py-2 text-center text-[11px] tracking-[0.14em] text-muted uppercase">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionGroups.map((group) => (
                <>
                  <tr key={group.label} className="bg-bg-subtle">
                    <td colSpan={ROLES.length + 1} className="px-3 py-1.5 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">
                      {group.label}
                    </td>
                  </tr>
                  {group.keys.map((key) => (
                    <tr key={key} className="border-b border-line/60">
                      <td className="px-3 py-1.5 font-mono text-[11px]">{key}</td>
                      {ROLES.map((role) => (
                        <td key={role} className="px-3 py-1.5 text-center">
                          {rolePermissions[role].includes(key) ? (
                            <ShieldCheck className="mx-auto size-3.5 text-ok" aria-label="Granted" />
                          ) : (
                            <span className="sr-only">Not granted</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-muted">
          A permission that isn't shown as granted is hidden from that role entirely, not merely disabled.
        </p>
      </Panel>

      <Panel title="Active sessions" description="Every signed-in session across staff accounts.">
        {state.sessions.length === 0 ? (
          <EmptyState title="No active sessions" />
        ) : (
          <ul className="divide-y divide-line">
            {state.sessions.map((s) => {
              const user = state.staff.find((u) => u.id === s.userId);
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">
                      {user?.name ?? "Unknown user"} {s.current ? <StatusPill tone="green">This session</StatusPill> : null}
                    </p>
                    <p className="text-[12px] text-muted">
                      {s.device} · {s.ip} · started {relativeTime(s.startedAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<UserX className="size-3.5" />}
                    onClick={() => setRevoking({ id: s.id, current: s.current })}
                  >
                    Revoke
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <InviteSheet open={inviteOpen} onOpenChange={setInviteOpen} onInvite={inviteUser} />

      {editing ? (
        <ManageSheet
          user={editing}
          onClose={() => setEditing(null)}
          onRole={(role) => updateRole(editing, role)}
          onSuspend={() => toggleSuspend(editing)}
          onForceReset={() => forceReset(editing)}
          onToggleTwoFactor={() => toggleTwoFactor(editing)}
          onRemove={() => {
            setRemoving(editing);
            setEditing(null);
          }}
          onOverride={(permission, value) => setOverride(editing, permission, value)}
          isLastOwner={editing.role === "Owner" && ownerCount(state.staff) <= 1}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(v) => !v && setRemoving(null)}
        title={`Remove ${removing?.name ?? "user"}`}
        body="This account will lose access immediately and its sessions will be revoked. This is recorded in the audit log."
        confirmLabel="Remove user"
        destructive
        typedConfirm="REMOVE"
        onConfirm={() => {
          if (removing) removeUser(removing);
          setRemoving(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(revoking)}
        onOpenChange={(v) => !v && setRevoking(null)}
        title={revoking?.current ? "Revoke your own session" : "Revoke session"}
        body={
          revoking?.current
            ? "This is the session you're using right now. Revoking it will sign you out immediately."
            : "The user will be signed out of that device immediately."
        }
        confirmLabel="Revoke"
        destructive
        onConfirm={() => {
          if (revoking) revokeSession(revoking.id);
          setRevoking(null);
        }}
      />
    </AdminShell>
  );
}

function InviteSheet({
  open,
  onOpenChange,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onInvite: (name: string, email: string, role: Role) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("Support");

  const reset = () => {
    setName("");
    setEmail("");
    setRole("Support");
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
      title="Invite a user"
      description="They'll be created with an invited status and must change their password at first sign-in."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!name.trim() || !email.trim()}
            onClick={() => {
              onInvite(name.trim(), email.trim(), role);
              reset();
            }}
          >
            Send invitation
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <SelectField
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          options={ROLES.map((r) => ({ value: r, label: r }))}
        />
      </div>
    </Sheet>
  );
}

function ManageSheet({
  user,
  onClose,
  onRole,
  onSuspend,
  onForceReset,
  onToggleTwoFactor,
  onRemove,
  onOverride,
  isLastOwner,
}: {
  user: StaffUser;
  onClose: () => void;
  onRole: (role: Role) => void;
  onSuspend: () => void;
  onForceReset: () => void;
  onToggleTwoFactor: () => void;
  onRemove: () => void;
  onOverride: (permission: Permission, value: boolean | undefined) => void;
  isLastOwner: boolean;
}) {
  const base = rolePermissions[user.role];
  const effective = permissionsFor(user.role, user.overrides);

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()} title={user.name} description={user.email} wide side="right">
      <div className="space-y-5">
        {isLastOwner ? (
          <InlineBanner tone="warn" title="Last Owner" body="This user is the only active Owner. Role, suspension and removal changes are blocked to prevent lockout." />
        ) : null}

        <Grid cols={2}>
          <SelectField
            label="Role"
            value={user.role}
            disabled={isLastOwner}
            onChange={(e) => onRole(e.target.value as Role)}
            options={ROLES.map((r) => ({ value: r, label: r }))}
          />
          <div className="flex flex-col gap-2">
            <Button
              disabled={isLastOwner && user.status !== "Suspended"}
              variant={user.status === "Suspended" ? "primary" : "danger"}
              onClick={onSuspend}
            >
              {user.status === "Suspended" ? "Restore access" : "Suspend user"}
            </Button>
          </div>
        </Grid>

        <div className="flex flex-wrap gap-2">
          <Button icon={<KeyRound className="size-3.5" />} onClick={onForceReset}>
            Force password reset
          </Button>
          <Button onClick={onRemove} disabled={isLastOwner} variant="danger" icon={<UserX className="size-3.5" />}>
            Remove user
          </Button>
        </div>

        <Toggle
          on={user.twoFactor}
          onChange={onToggleTwoFactor}
          label="Require two-factor authentication"
          description="This user must set up 2FA before continuing to use the admin."
        />

        <div>
          <p className="eyebrow mb-2">Permission overrides</p>
          <p className="mb-3 text-[12px] text-muted">
            Overrides adjust this user's access beyond their role's defaults. A permission that is hidden below is neither granted by
            the role nor overridden — it is entirely absent for this user.
          </p>
          <div className="space-y-4">
            {permissionGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{group.label}</p>
                <div className="space-y-1">
                  {group.keys.map((key) => {
                    const roleGrants = base.includes(key);
                    const override = user.overrides[key];
                    const has = effective.has(key);
                    return (
                      <div key={key} className="flex items-center justify-between gap-3 rounded-[8px] px-2 py-1.5 hover:bg-bg-subtle">
                        <div className="min-w-0">
                          <p className="font-mono text-[12px]">{key}</p>
                          <p className="text-[11px] text-muted">
                            Role default: {roleGrants ? "granted" : "absent"}
                            {override !== undefined ? ` · overridden to ${override ? "granted" : "revoked"}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="sm"
                            variant={has ? "primary" : "ghost"}
                            onClick={() => onOverride(key, roleGrants ? undefined : true)}
                          >
                            Grant
                          </Button>
                          <Button
                            size="sm"
                            variant={!has ? "danger" : "ghost"}
                            onClick={() => onOverride(key, roleGrants ? false : undefined)}
                          >
                            Revoke
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
