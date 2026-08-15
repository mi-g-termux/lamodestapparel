/**
 * The admin data layer.
 *
 * The screens still read one document-shaped state object, exactly as before,
 * but nothing is invented locally any more: the document is built by the server
 * from Postgres (`GET /api/admin/state`) and every write is pushed back
 * (`PUT /api/admin/state`). A brand new shop therefore starts completely empty
 * — no demo products, no fake sales.
 */
import { useSyncExternalStore } from "react";
import type { AdminState, AuditEntry, Order, Product, StaffUser } from "./types";
import { emptyState } from "./empty";
import { permissionsFor, type Permission } from "./permissions";
import { defaultCurrency, type CurrencyConfig } from "./money";
import { adminApi, api, ApiError } from "@/lib/api";

let state: AdminState = emptyState();
const listeners = new Set<() => void>();
let hydrated = false;
let loading = false;
let lastError: string | null = null;

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const getSnapshot = (): AdminState => state;

/* ── Reads ───────────────────────────────────────────────────────────────── */

export function useAdminState(): AdminState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function readState(): AdminState {
  return state;
}

export function useSelector<T>(select: (s: AdminState) => T): T {
  return select(useAdminState());
}

export function isLoading(): boolean {
  return loading;
}

export function storeError(): string | null {
  return lastError;
}

/** Merge a server payload into the in-memory document. */
function applyServer(payload: Record<string, unknown>): void {
  const base = emptyState();
  const server = payload as Partial<AdminState> & {
    serverSettings?: Record<string, Record<string, unknown>>;
    content?: Record<string, unknown>;
    notifications?: unknown[];
  };

  state = {
    ...base,
    ...server,
    content: { ...base.content, ...(server.content ?? {}) } as AdminState["content"],
    settings: mergeSettings(base.settings, server.serverSettings ?? {}),
  } as AdminState;
  emit();
}

/**
 * The server keeps settings in namespaces (branding, currency, orders, smtp,
 * features …). The UI keeps one flat-ish object. Copy every namespace across
 * and keep the UI's own defaults for anything the server does not know about.
 */
function mergeSettings(
  base: AdminState["settings"],
  namespaces: Record<string, Record<string, unknown>>,
): AdminState["settings"] {
  const merged = { ...(base as Record<string, unknown>) };
  for (const [ns, values] of Object.entries(namespaces)) {
    merged[ns] = { ...((merged[ns] as Record<string, unknown>) ?? {}), ...values };
  }
  merged["settingsVersion"] = Number((base as Record<string, unknown>)["settingsVersion"] ?? 0) + 1;
  return merged as AdminState["settings"];
}

/** Pull the whole admin document from the server. Safe to call repeatedly. */
export async function refreshStore(): Promise<void> {
  loading = true;
  emit();
  try {
    const payload = await api.get<Record<string, unknown>>("/api/admin/state");
    applyServer(payload);
    lastError = null;
  } catch (error) {
    lastError = error instanceof ApiError && error.status === 401 ? null : (error as Error).message;
  } finally {
    loading = false;
    emit();
  }
}

/** Called once when the admin shell mounts. */
export function hydrateStore(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  void refreshStore();
}

export function resetStore(): void {
  state = emptyState();
  hydrated = false;
  emit();
}

/* ── Writes ──────────────────────────────────────────────────────────────── */

type Mutator = (draft: AdminState) => void;
export type AuditMeta = { action: string; entity: string; before?: unknown; after?: unknown };

/** Which server collections a change touches, so we only send what moved. */
const SYNCED_KEYS = ["categories", "content", "settings"] as const;

function serverPayload(next: AdminState, previous: AdminState): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const content = next.content as unknown as Record<string, unknown>;
  const oldContent = previous.content as unknown as Record<string, unknown>;

  for (const key of ["banners", "pages", "navigation", "testimonials"]) {
    if (content?.[key] && content[key] !== oldContent?.[key]) payload[key] = content[key];
  }
  if (next.categories !== previous.categories) payload["categories"] = next.categories;

  const settings = next.settings as unknown as Record<string, unknown>;
  const oldSettings = previous.settings as unknown as Record<string, unknown>;
  const changedNamespaces: Record<string, unknown> = {};
  for (const [ns, value] of Object.entries(settings)) {
    if (ns === "settingsVersion") continue;
    if (value && typeof value === "object" && value !== oldSettings[ns]) changedNamespaces[ns] = value;
  }
  if (Object.keys(changedNamespaces).length) payload["serverSettings"] = changedNamespaces;

  return payload;
}

/**
 * Optimistic write: the screen updates immediately, then the change is sent to
 * the server. If the server rejects it we reload the truth and surface the
 * message instead of pretending the edit worked.
 */
export function mutate(fn: Mutator, audit?: AuditMeta): void {
  const previous = state;
  const next: AdminState = structuredClone(state);
  fn(next);

  if (audit) {
    const actor = next.staff.find((s) => s.id === next.auth.userId)?.name ?? "System";
    const entry: AuditEntry = {
      id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      actor,
      action: audit.action,
      entity: audit.entity,
      ip: "",
      before: audit.before ?? null,
      after: audit.after ?? null,
    };
    next.audit = [entry, ...next.audit].slice(0, 400);
  }

  state = next;
  emit();

  const payload = serverPayload(next, previous);
  if (Object.keys(payload).length === 0) return;

  void api
    .put("/api/admin/state", payload)
    .catch(async (error: unknown) => {
      lastError = (error as Error).message;
      emit();
      await refreshStore();
    });
}

export function mutateSettings(fn: Mutator, audit: AuditMeta): void {
  mutate((draft) => {
    fn(draft);
    const bag = draft.settings as unknown as Record<string, number>;
    bag["settingsVersion"] = Number(bag["settingsVersion"] ?? 0) + 1;
  }, audit);
}

export function mutateContent(fn: Mutator, audit: AuditMeta): void {
  mutateSettings(fn, audit);
}

/** Direct, non-document writes (products, orders, media …) live on adminApi. */
export { adminApi };

/* ── Auth ────────────────────────────────────────────────────────────────── */

const lockoutLadder = [15, 30, 60, 240, 720, 1440];

export function lockoutMinutesFor(failures: number): number {
  if (failures < 5) return 0;
  return lockoutLadder[Math.min(failures - 5, lockoutLadder.length - 1)]!;
}

export type LoginResult =
  | { ok: true; user: StaffUser; mustChangePassword?: boolean }
  | { ok: false; error: string; lockedMinutes?: number };

/**
 * Passwords are never compared in the browser. This posts to the server, which
 * checks a scrypt hash, applies the lock-out ladder and sets an HttpOnly
 * session cookie.
 */
export async function attemptLogin(email: string, password: string): Promise<LoginResult> {
  try {
    const result = await adminApi.login(email, password);
    await refreshStore();
    return {
      ok: true,
      user: result.user as unknown as StaffUser,
      mustChangePassword: result.mustChangePassword,
    };
  } catch (error) {
    const message = error instanceof ApiError ? error.message : "Could not reach the server.";
    const locked = error instanceof ApiError && error.status === 423;
    return { ok: false, error: message, ...(locked ? { lockedMinutes: 15 } : {}) };
  }
}

export async function logout(): Promise<void> {
  try {
    await adminApi.logout();
  } finally {
    resetStore();
    if (typeof window !== "undefined") window.location.assign("/admin/login");
  }
}

export function currentUser(): StaffUser | null {
  const id = state.auth.userId;
  return id ? (state.staff.find((s) => s.id === id) ?? null) : null;
}

export function useCurrentUser(): StaffUser | null {
  const s = useAdminState();
  const id = s.auth.userId;
  return id ? (s.staff.find((u) => u.id === id) ?? null) : null;
}

export function useIsSignedIn(): boolean {
  return useAdminState().auth.userId !== null;
}

export function canFor(user: StaffUser | null, permission: Permission): boolean {
  if (!user) return false;
  // Stored overrides may arrive as a plain list of granted permissions, but
  // permissionsFor expects a map of permission -> boolean, so convert.
  const raw = (user as unknown as { permissions?: Permission[]; overrides?: Partial<Record<Permission, boolean>> });
  const overrides: Partial<Record<Permission, boolean>> = { ...(raw.overrides ?? {}) };
  for (const granted of raw.permissions ?? []) overrides[granted] = true;
  return permissionsFor(user.role, overrides).has(permission);
}

export function useCan(): (permission: Permission) => boolean {
  const user = useCurrentUser();
  return (permission: Permission) => canFor(user, permission);
}

/* ── Derived helpers (unchanged public shape) ────────────────────────────── */

export function useCurrency(): CurrencyConfig {
  const s = useAdminState();
  const currency = (s.settings as unknown as Record<string, Record<string, unknown>>)["currency"] ?? {};
  return {
    ...defaultCurrency,
    code: String(currency["base"] ?? defaultCurrency.code),
    symbol: String(currency["symbol"] ?? defaultCurrency.symbol),
    decimals: Number(currency["decimals"] ?? defaultCurrency.decimals),
  };
}

export { defaultCurrency };

export function mediaUrl(s: AdminState, id: string | null | undefined): string | null {
  if (!id) return null;
  return s.media.find((m) => m.id === id)?.url ?? null;
}

export function mediaAlt(s: AdminState, id: string | null | undefined): string {
  if (!id) return "";
  return s.media.find((m) => m.id === id)?.alt ?? "";
}

export function orderTotal(o: Order): number {
  const record = o as unknown as Record<string, number>;
  if (typeof record["totalMinor"] === "number") return record["totalMinor"];
  const items = (o.items ?? []).reduce((t, i) => t + Number((i as unknown as { total?: number }).total ?? 0), 0);
  return items - (o.discountMinor ?? 0) + (o.shippingMinor ?? 0) + (o.taxMinor ?? 0);
}

export function productStock(p: Product): number {
  const record = p as unknown as { stock?: number; variants?: Array<{ stock: number }> };
  if (record.variants?.length) return record.variants.reduce((t, v) => t + Number(v.stock ?? 0), 0);
  return Number(record.stock ?? 0);
}

export function productRating(s: AdminState, p: Product): { rating: number; count: number } {
  if (p.ratingOverride !== null && p.ratingOverride !== undefined) {
    return { rating: p.ratingOverride, count: 0 };
  }
  const reviews = s.reviews.filter(
    (r) => (r as unknown as { productId: string }).productId === p.id &&
           (r as unknown as { state: string }).state === "published",
  );
  if (!reviews.length) return { rating: 0, count: 0 };
  const total = reviews.reduce((t, r) => t + Number((r as unknown as { rating: number }).rating ?? 0), 0);
  return { rating: Math.round((total / reviews.length) * 10) / 10, count: reviews.length };
}

/** Stock changes go straight to the products endpoint so they are authoritative. */
export function adjustStock(productId: string, variantId: string | null, delta: number, reason = "Manual adjustment"): void {
  mutate(
    (draft) => {
      const product = draft.products.find((p) => p.id === productId);
      if (!product) return;
      if (variantId) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (variant) variant.stock = Math.max(0, Number(variant.stock) + delta);
      }
      const record = product as unknown as { stock: number };
      record.stock = Math.max(0, Number(record.stock ?? 0) + delta);
    },
    { action: "inventory.adjust", entity: productId, after: { delta, reason } },
  );

  const product = state.products.find((p) => p.id === productId);
  if (product) {
    void adminApi
      .updateProduct(productId, { stock: (product as unknown as { stock: number }).stock })
      .catch(() => refreshStore());
  }
}

/**
 * Order numbers are issued by the database so two shoppers can never collide.
 * This returns the preview the admin sees while editing the prefix.
 */
export function nextOrderNumber(): string {
  const orders = (state.settings as unknown as Record<string, Record<string, unknown>>)["orders"] ?? {};
  const prefix = String(orders["number_prefix"] ?? "ORD-");
  const suffix = String(orders["number_suffix"] ?? "");
  const padding = Number(orders["number_padding"] ?? 5);
  const year = orders["include_year"] ? `${new Date().getFullYear()}-` : "";
  const next = state.orders.length + Number(orders["number_start"] ?? 1);
  return `${prefix}${year}${String(next).padStart(padding, "0")}${suffix}`;
}
