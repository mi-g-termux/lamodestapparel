/**
 * Dashboard + analytics computations (§6). Every figure is derived from real
 * orders in state — no hardcoded arrays, deltas or funnels anywhere.
 */
import type { AdminState, Order } from "./types";
import type { Minor } from "./money";

export type RangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "month"
  | "lastMonth"
  | "year"
  | "custom";

export const rangeOptions: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom range" },
];

export type Period = { from: Date; to: Date; label: string };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export function resolveRange(key: RangeKey, custom?: { from: string; to: string }): Period {
  const now = new Date();
  switch (key) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now), label: "Today" };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y), label: "Yesterday" };
    }
    case "7d": {
      const f = new Date(now);
      f.setDate(f.getDate() - 6);
      return { from: startOfDay(f), to: endOfDay(now), label: "Last 7 days" };
    }
    case "90d": {
      const f = new Date(now);
      f.setDate(f.getDate() - 89);
      return { from: startOfDay(f), to: endOfDay(now), label: "Last 90 days" };
    }
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now), label: "This month" };
    case "lastMonth":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
        label: "Last month",
      };
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now), label: "This year" };
    case "custom": {
      if (custom?.from && custom?.to) {
        return { from: startOfDay(new Date(custom.from)), to: endOfDay(new Date(custom.to)), label: "Custom range" };
      }
      const f = new Date(now);
      f.setDate(f.getDate() - 29);
      return { from: startOfDay(f), to: endOfDay(now), label: "Custom range" };
    }
    case "30d":
    default: {
      const f = new Date(now);
      f.setDate(f.getDate() - 29);
      return { from: startOfDay(f), to: endOfDay(now), label: "Last 30 days" };
    }
  }
}

export function previousPeriod(p: Period, mode: "previous" | "lastYear" | "none"): Period | null {
  if (mode === "none") return null;
  if (mode === "lastYear") {
    const from = new Date(p.from);
    const to = new Date(p.to);
    from.setFullYear(from.getFullYear() - 1);
    to.setFullYear(to.getFullYear() - 1);
    return { from, to, label: "Same period last year" };
  }
  const span = p.to.getTime() - p.from.getTime();
  return {
    from: new Date(p.from.getTime() - span - 1),
    to: new Date(p.from.getTime() - 1),
    label: "Previous period",
  };
}

export function ordersIn(orders: Order[], p: Period, filters?: { country?: string; channel?: string }) {
  return orders.filter((o) => {
    const t = new Date(o.placedAt).getTime();
    if (t < p.from.getTime() || t > p.to.getTime()) return false;
    if (filters?.country && filters.country !== "All" && o.country !== filters.country) return false;
    if (filters?.channel && filters.channel !== "All" && o.channel !== filters.channel) return false;
    return true;
  });
}

const paidStatuses = new Set(["Paid", "Partially refunded", "Refunded"]);

export type Kpis = {
  grossMinor: Minor;
  discountsMinor: Minor;
  refundsMinor: Minor;
  netMinor: Minor;
  taxMinor: Minor;
  shippingChargedMinor: Minor;
  shippingCostMinor: Minor;
  shippingMarginMinor: Minor;
  orders: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  units: number;
  aovMinor: Minor;
  cogsMinor: Minor;
  profitMinor: Minor;
  marginPct: number;
  newCustomers: number;
  returningCustomers: number;
  newRevenueMinor: Minor;
  returningRevenueMinor: Minor;
  refundRate: number;
  cancellationRate: number;
  returnRate: number;
};

export function computeKpis(orders: Order[]): Kpis {
  let gross = 0,
    discounts = 0,
    refunds = 0,
    tax = 0,
    shipCharged = 0,
    shipCost = 0,
    units = 0,
    cogs = 0,
    paidOrders = 0,
    pending = 0,
    cancelled = 0,
    returned = 0,
    refundedCount = 0,
    newCustomers = 0,
    newRevenue = 0,
    returningRevenue = 0;

  for (const o of orders) {
    const lineTotal = o.items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    gross += lineTotal;
    discounts += o.discountMinor;
    refunds += o.refundedMinor;
    tax += o.taxMinor;
    shipCharged += o.shippingMinor;
    shipCost += o.shippingCostMinor;
    units += o.items.reduce((s, it) => s + it.qty, 0);
    cogs += o.items.reduce((s, it) => s + it.unitCost * it.qty, 0);
    if (paidStatuses.has(o.payment)) paidOrders++;
    if (o.payment === "Pending" || o.payment === "Authorised") pending++;
    if (o.status === "Cancelled") cancelled++;
    if (o.status === "Returned") returned++;
    if (o.refundedMinor > 0) refundedCount++;
    const net = lineTotal - o.discountMinor - o.refundedMinor;
    if (o.isFirstOrder) {
      newCustomers++;
      newRevenue += net;
    } else returningRevenue += net;
  }

  const net = gross - discounts - refunds;
  const count = orders.length || 1;
  return {
    grossMinor: gross,
    discountsMinor: discounts,
    refundsMinor: refunds,
    netMinor: net,
    taxMinor: tax,
    shippingChargedMinor: shipCharged,
    shippingCostMinor: shipCost,
    shippingMarginMinor: shipCharged - shipCost,
    orders: orders.length,
    paidOrders,
    pendingOrders: pending,
    cancelledOrders: cancelled,
    units,
    aovMinor: paidOrders ? Math.round(net / paidOrders) : 0,
    cogsMinor: cogs,
    profitMinor: net - cogs,
    marginPct: net ? ((net - cogs) / net) * 100 : 0,
    newCustomers,
    returningCustomers: orders.length - newCustomers,
    newRevenueMinor: newRevenue,
    returningRevenueMinor: returningRevenue,
    refundRate: (refundedCount / count) * 100,
    cancellationRate: (cancelled / count) * 100,
    returnRate: (returned / count) * 100,
  };
}

export type Granularity = "hour" | "day" | "week" | "month";

export function granularityFor(p: Period): Granularity {
  const days = (p.to.getTime() - p.from.getTime()) / 86_400_000;
  if (days <= 2) return "hour";
  if (days <= 90) return "day";
  if (days <= 400) return "week";
  return "month";
}

function bucketKey(date: Date, g: Granularity): string {
  if (g === "hour") return `${String(date.getHours()).padStart(2, "0")}:00`;
  if (g === "month") return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  if (g === "week") {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export type SeriesPoint = {
  key: string;
  revenue: number;
  orders: number;
  aov: number;
  compare?: number;
};

export function revenueSeries(orders: Order[], p: Period, compareOrders?: Order[]): SeriesPoint[] {
  const g = granularityFor(p);
  const map = new Map<string, { revenue: number; orders: number }>();
  const keys: string[] = [];
  const cursor = new Date(p.from);
  while (cursor <= p.to) {
    const k = bucketKey(cursor, g);
    if (!map.has(k)) {
      map.set(k, { revenue: 0, orders: 0 });
      keys.push(k);
    }
    if (g === "hour") cursor.setHours(cursor.getHours() + 1);
    else if (g === "day") cursor.setDate(cursor.getDate() + 1);
    else if (g === "week") cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
  }
  for (const o of orders) {
    const k = bucketKey(new Date(o.placedAt), g);
    const slot = map.get(k);
    if (!slot) continue;
    slot.revenue += o.items.reduce((s, it) => s + it.unitPrice * it.qty, 0) - o.discountMinor - o.refundedMinor;
    slot.orders += 1;
  }
  const compareTotals = compareOrders
    ? compareOrders.reduce(
        (s, o) => s + o.items.reduce((t, it) => t + it.unitPrice * it.qty, 0) - o.discountMinor - o.refundedMinor,
        0,
      ) / Math.max(1, keys.length)
    : undefined;

  return keys.map((k) => {
    const v = map.get(k)!;
    return {
      key: k,
      revenue: v.revenue / 100,
      orders: v.orders,
      aov: v.orders ? v.revenue / v.orders / 100 : 0,
      ...(compareTotals !== undefined ? { compare: compareTotals / 100 } : {}),
    };
  });
}

export function ordersByStatusSeries(orders: Order[], p: Period) {
  const g = granularityFor(p);
  const map = new Map<string, Record<string, number>>();
  const keys: string[] = [];
  for (const o of orders) {
    const k = bucketKey(new Date(o.placedAt), g);
    if (!map.has(k)) {
      map.set(k, {});
      keys.push(k);
    }
    const slot = map.get(k)!;
    slot[o.status] = (slot[o.status] ?? 0) + 1;
  }
  return keys.reverse().map((k) => ({ key: k, ...map.get(k) }));
}

export function groupRevenue(orders: Order[], by: (o: Order) => string) {
  const map = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    const key = by(o);
    const slot = map.get(key) ?? { revenue: 0, orders: 0 };
    slot.revenue += o.items.reduce((s, it) => s + it.unitPrice * it.qty, 0) - o.discountMinor;
    slot.orders += 1;
    map.set(key, slot);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, revenueMinor: v.revenue, orders: v.orders }))
    .sort((a, b) => b.revenueMinor - a.revenueMinor);
}

export function bestSellers(state: AdminState, orders: Order[], limit = 8) {
  const map = new Map<string, { units: number; revenue: number; cost: number; variants: Map<string, number> }>();
  for (const o of orders) {
    for (const it of o.items) {
      const slot = map.get(it.productId) ?? { units: 0, revenue: 0, cost: 0, variants: new Map() };
      slot.units += it.qty;
      slot.revenue += it.unitPrice * it.qty;
      slot.cost += it.unitCost * it.qty;
      slot.variants.set(it.variantLabel, (slot.variants.get(it.variantLabel) ?? 0) + it.qty);
      map.set(it.productId, slot);
    }
  }
  const totalRevenue = [...map.values()].reduce((s, v) => s + v.revenue, 0) || 1;
  return [...map.entries()]
    .map(([productId, v]) => {
      const product = state.products.find((p) => p.id === productId);
      return {
        productId,
        name: product?.name ?? productId,
        imageId: product?.primaryImageId ?? null,
        units: v.units,
        revenueMinor: v.revenue,
        share: (v.revenue / totalRevenue) * 100,
        stock: product?.variants.reduce((s, x) => s + x.stock, 0) ?? 0,
        marginPct: v.revenue ? ((v.revenue - v.cost) / v.revenue) * 100 : 0,
        topVariants: [...v.variants.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
      };
    })
    .sort((a, b) => b.revenueMinor - a.revenueMinor)
    .slice(0, limit);
}

export function worstPerformers(state: AdminState, orders: Order[], limit = 5) {
  const sold = new Map<string, { units: number; last: string }>();
  for (const o of orders)
    for (const it of o.items) {
      const s = sold.get(it.productId) ?? { units: 0, last: o.placedAt };
      s.units += it.qty;
      if (o.placedAt > s.last) s.last = o.placedAt;
      sold.set(it.productId, s);
    }
  return state.products
    .filter((p) => p.status === "Active")
    .map((p) => {
      const s = sold.get(p.id);
      const lastSale = s?.last ?? null;
      return {
        id: p.id,
        name: p.name,
        units: s?.units ?? 0,
        daysSinceLastSale: lastSale
          ? Math.round((Date.now() - new Date(lastSale).getTime()) / 86_400_000)
          : null,
      };
    })
    .sort((a, b) => a.units - b.units)
    .slice(0, limit);
}

export function topCustomers(state: AdminState, orders: Order[], limit = 6) {
  const map = new Map<string, { orders: number; spend: number; last: string; name: string }>();
  for (const o of orders) {
    const slot = map.get(o.customerId) ?? { orders: 0, spend: 0, last: o.placedAt, name: o.customerName };
    slot.orders += 1;
    slot.spend += o.items.reduce((s, it) => s + it.unitPrice * it.qty, 0) - o.discountMinor - o.refundedMinor;
    if (o.placedAt > slot.last) slot.last = o.placedAt;
    map.set(o.customerId, slot);
  }
  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, limit);
}

export function heatmap(orders: Order[]) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const o of orders) {
    const d = new Date(o.placedAt);
    grid[d.getDay()]![d.getHours()]! += 1;
  }
  return grid;
}

export function couponPerformance(state: AdminState, orders: Order[]) {
  const map = new Map<string, { uses: number; discount: number; revenue: number }>();
  for (const o of orders) {
    if (!o.couponCode) continue;
    const slot = map.get(o.couponCode) ?? { uses: 0, discount: 0, revenue: 0 };
    slot.uses += 1;
    slot.discount += o.discountMinor;
    slot.revenue += o.items.reduce((s, it) => s + it.unitPrice * it.qty, 0) - o.discountMinor;
    map.set(o.couponCode, slot);
  }
  return [...map.entries()].map(([code, v]) => ({ code, ...v })).sort((a, b) => b.revenue - a.revenue);
}

export function needsAttention(state: AdminState) {
  const lowStock = state.products.flatMap((p) =>
    p.variants.filter((v) => v.stock > 0 && v.stock <= v.lowStock).map((v) => ({ p, v })),
  );
  const outOfStock = state.products.flatMap((p) => p.variants.filter((v) => v.stock === 0).map((v) => ({ p, v })));
  const heldOver48h = state.orders.filter(
    (o) => o.status === "Pending" && Date.now() - new Date(o.placedAt).getTime() > 48 * 3600_000,
  );
  return [
    { label: "Orders to fulfil", count: state.orders.filter((o) => o.status === "Confirmed" || o.status === "Packed").length, to: "/orders", search: { status: "Confirmed" } },
    { label: "Awaiting payment", count: state.orders.filter((o) => o.payment === "Pending").length, to: "/orders", search: { payment: "Pending" } },
    { label: "Failed payments", count: state.orders.filter((o) => o.payment === "Failed").length, to: "/orders", search: { payment: "Failed" } },
    { label: "Held over 48h", count: heldOver48h.length, to: "/orders", search: { status: "Pending" } },
    { label: "Courier errors", count: state.shipments.filter((s) => s.status === "Error").length, to: "/shipments", search: {} },
    { label: "Low stock", count: lowStock.length, to: "/inventory", search: { filter: "low" } },
    { label: "Out of stock", count: outOfStock.length, to: "/inventory", search: { filter: "out" } },
    { label: "Back-in-stock requests", count: state.backInStock.filter((b) => !b.notified).length, to: "/back-in-stock", search: {} },
    { label: "Reviews to moderate", count: state.reviews.filter((r) => r.state === "Pending").length, to: "/reviews", search: {} },
    { label: "Unanswered messages", count: state.messages.filter((m) => m.state === "Pending").length, to: "/messages", search: {} },
    { label: "Refund requests", count: state.returns.filter((r) => r.status === "Requested").length, to: "/returns", search: {} },
    { label: "Abandoned carts", count: state.abandonedCarts.filter((c) => !c.recovered).length, to: "/abandoned-carts", search: {} },
  ];
}

export function inventoryValue(state: AdminState) {
  let units = 0,
    retail = 0,
    cost = 0;
  for (const p of state.products)
    for (const v of p.variants) {
      units += v.stock;
      retail += v.stock * v.price;
      cost += v.stock * v.cost;
    }
  return { units, retailMinor: retail, costMinor: cost };
}

export function deltaPct(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
