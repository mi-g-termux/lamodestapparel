/**
 * A brand new shop.
 *
 * The admin panel used to boot from a large demo dataset. It now boots from
 * this: the same document shape, but every collection empty, so a fresh
 * install shows £0 revenue, zero orders and no products until real ones exist.
 * The server immediately replaces the settings section with the real values
 * from the database.
 */
import type { AdminState } from "./types";
import { seedState } from "./seed";

let shape: AdminState | null = null;

/** The seed is used purely for its default settings/content shape. */
function shapeOnce(): AdminState {
  shape ??= seedState();
  return shape;
}

export function emptyState(): AdminState {
  const base = structuredClone(shapeOnce());

  return {
    ...base,
    media: [],
    products: [],
    categories: [],
    collections: [],
    inventoryLedger: [],
    orders: [],
    draftOrders: [],
    abandonedCarts: [],
    shipments: [],
    returns: [],
    customers: [],
    subscribers: [],
    backInStock: [],
    discounts: [],
    offers: [],
    giftCards: [],
    reviews: [],
    messages: [],
    staff: [],
    sessions: [],
    audit: [],
    backups: [],
    webhooks: [],
    jobs: [],
    content: {
      ...base.content,
      ...(Object.fromEntries(
        Object.entries(base.content as unknown as Record<string, unknown>).map(([key, value]) => [
          key,
          Array.isArray(value) ? [] : value,
        ]),
      ) as Partial<AdminState["content"]>),
    },
    setupSteps: {},
    auth: { userId: null, startedAt: null },
  };
}
