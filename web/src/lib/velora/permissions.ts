/**
 * Granular permission layer (§4.3). Enforced at nav, route and mutation.
 * Hidden means ABSENT, not disabled.
 */
export const PERMISSIONS = [
  "dashboard.view",
  "report.revenue.view",
  "report.profit.view",
  "order.read",
  "order.status.update",
  "order.refund",
  "order.edit",
  "order.create",
  "shipment.manage",
  "product.read",
  "product.create",
  "product.update",
  "product.delete",
  "inventory.update",
  "category.write",
  "customer.read",
  "customer.export",
  "customer.write",
  "marketing.write",
  "review.moderate",
  "message.reply",
  "content.write",
  "theme.write",
  "media.write",
  "settings.read",
  "settings.write",
  "settings.payments.read",
  "settings.payments.write",
  "settings.smtp.write",
  "staff.manage",
  "audit.view",
  "system.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = ["Owner", "Developer", "Manager", "Staff", "Fulfilment", "Support", "Read-only"] as const;
export type Role = (typeof ROLES)[number];

const all = [...PERMISSIONS] as Permission[];

const read: Permission[] = [
  "dashboard.view",
  "order.read",
  "product.read",
  "customer.read",
  "settings.read",
];

export const rolePermissions: Record<Role, Permission[]> = {
  Owner: all,
  Developer: all,
  Manager: all.filter((p) => p !== "staff.manage" && p !== "system.manage"),
  Staff: [
    ...read,
    "report.revenue.view",
    "order.status.update",
    "order.edit",
    "product.create",
    "product.update",
    "inventory.update",
    "review.moderate",
    "message.reply",
    "content.write",
    "media.write",
  ],
  Fulfilment: [...read, "order.status.update", "shipment.manage", "inventory.update"],
  Support: [...read, "order.status.update", "message.reply", "review.moderate", "customer.write"],
  "Read-only": read,
};

export function permissionsFor(role: Role, overrides: Partial<Record<Permission, boolean>> = {}) {
  const base = new Set(rolePermissions[role]);
  for (const [key, value] of Object.entries(overrides)) {
    if (value) base.add(key as Permission);
    else base.delete(key as Permission);
  }
  return base;
}

export const permissionGroups: { label: string; keys: Permission[] }[] = [
  { label: "Reporting", keys: ["dashboard.view", "report.revenue.view", "report.profit.view", "audit.view"] },
  {
    label: "Orders",
    keys: ["order.read", "order.create", "order.edit", "order.status.update", "order.refund", "shipment.manage"],
  },
  {
    label: "Catalogue",
    keys: [
      "product.read",
      "product.create",
      "product.update",
      "product.delete",
      "inventory.update",
      "category.write",
    ],
  },
  { label: "Customers", keys: ["customer.read", "customer.write", "customer.export"] },
  { label: "Marketing & engagement", keys: ["marketing.write", "review.moderate", "message.reply"] },
  { label: "Content", keys: ["content.write", "theme.write", "media.write"] },
  {
    label: "Settings",
    keys: [
      "settings.read",
      "settings.write",
      "settings.payments.read",
      "settings.payments.write",
      "settings.smtp.write",
    ],
  },
  { label: "System", keys: ["staff.manage", "system.manage"] },
];
