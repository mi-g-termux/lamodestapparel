import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAdminState, useCan } from "@/lib/velora/store";
import { navGroups } from "./AdminShell";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const state = useAdminState();
  const can = useCan();
  const navigate = useNavigate();

  const pages = useMemo(
    () => navGroups.flatMap((g) => g.items.filter((i) => can(i.permission)).map((i) => ({ ...i, group: g.label }))),
    [can],
  );

  const go = (to: string, params?: Record<string, string>) => {
    onOpenChange(false);
    void navigate({ to, params: params as never });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-start justify-center bg-ink/50 p-4 pt-[12vh]">
      <Command
        label="Command palette"
        loop
        className="card w-full max-w-[560px] overflow-hidden shadow-2xl"
        onKeyDown={(e) => {
          if (e.key === "Escape") onOpenChange(false);
        }}
      >
        <Command.Input
          autoFocus
          placeholder="Search screens, orders, products, customers…"
          className="w-full border-b border-line px-4 py-3 text-[14px] outline-none"
        />
        <Command.List className="max-h-[52vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-[13px] text-muted">No matches.</Command.Empty>

          <Command.Group heading="Screens" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {pages.map((p) => (
              <Command.Item
                key={p.to}
                value={`${p.label} ${p.group}`}
                onSelect={() => go(p.to)}
                className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-[13px] data-[selected=true]:bg-cream"
              >
                {p.icon}
                {p.label}
                <span className="ml-auto text-[11px] text-muted">{p.group}</span>
              </Command.Item>
            ))}
          </Command.Group>

          {can("order.read") ? (
            <Command.Group heading="Orders" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              {state.orders.slice(0, 40).map((o) => (
                <Command.Item
                  key={o.id}
                  value={`${o.number} ${o.customerName} ${o.email} ${o.tracking ?? ""}`}
                  onSelect={() => go("/orders/$id", { id: o.id })}
                  className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-[13px] data-[selected=true]:bg-cream"
                >
                  <span className="tnum">{o.number}</span>
                  <span className="truncate text-muted">{o.customerName}</span>
                  <span className="ml-auto text-[11px] text-muted">{o.status}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          {can("product.read") ? (
            <Command.Group heading="Products" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              {state.products.map((p) => (
                <Command.Item
                  key={p.id}
                  value={`${p.name} ${p.category} ${p.collection}`}
                  onSelect={() => go("/products/$id", { id: p.id })}
                  className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-[13px] data-[selected=true]:bg-cream"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto text-[11px] text-muted">{p.status}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          {can("customer.read") ? (
            <Command.Group heading="Customers" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              {state.customers.slice(0, 40).map((c) => (
                <Command.Item
                  key={c.id}
                  value={`${c.name} ${c.email}`}
                  onSelect={() => go("/customers/$id", { id: c.id })}
                  className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-[13px] data-[selected=true]:bg-cream"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto truncate text-[11px] text-muted">{c.email}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
        </Command.List>
      </Command>
    </div>
  );
}
