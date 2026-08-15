// Client-side storefront state: bag, wishlist, demo account session and orders.
// Everything persists to localStorage so the theme is fully usable without a
// backend; swapping these functions for API/database calls is the only change
// needed to go live.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getProduct, site } from "@/content/site";
import {
  shippingMethods,
  shippingCost,
  deliveryEstimate,
  type ShippingMethod,
} from "@/lib/regions";
import { useLocale } from "@/lib/locale";

export type CartItem = {
  key: string;
  slug: string;
  name: string;
  image: string;
  unitPrice: number;
  size: string;
  color: string;
  qty: number;
};

export type OrderStatus = "Confirmed" | "Packed" | "Shipped" | "Out for delivery" | "Delivered";

export const orderStages: OrderStatus[] = [
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for delivery",
  "Delivered",
];

export type Address = {
  name: string;
  email: string;
  dial: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postcode: string;
  countryCode: string;
  country: string;
};

export type OrderCurrency = { code: string; symbol: string; rate: number; decimals: number };

export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  items: CartItem[];
  address: Address;
  payment: string;
  totals: Totals;
  trackingNumber: string;
  carrier: string;
  eta: string;
  shippingMethod: string;
  shippingWindow: string;
  currency: OrderCurrency;
};

export type Totals = {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
};

export type Account = { name: string; email: string };

/** Human-readable step copy + a synthetic timestamp for each tracking stage. */
export const stageCopy: Record<OrderStatus, string> = {
  Confirmed: "Order placed and payment authorised",
  Packed: "Picked and packed at our studio",
  Shipped: "Handed to the carrier",
  "Out for delivery": "With your courier today",
  Delivered: "Left with the recipient",
};

const stageOffsetHours: Record<OrderStatus, number> = {
  Confirmed: 0,
  Packed: 8,
  Shipped: 26,
  "Out for delivery": 68,
  Delivered: 74,
};

export type TimelineStep = {
  stage: OrderStatus;
  detail: string;
  at: Date;
  done: boolean;
  current: boolean;
};

export function orderTimeline(order: Order): TimelineStep[] {
  const start = new Date(order.createdAt).getTime();
  const idx = orderStages.indexOf(order.status);
  return orderStages.map((stage, i) => ({
    stage,
    detail: stageCopy[stage],
    at: new Date(start + stageOffsetHours[stage] * 3600000),
    done: i <= idx,
    current: i === idx,
  }));
}

export const formatStamp = (d: Date) =>
  d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const KEYS = {
  cart: "velora.cart",
  wishlist: "velora.wishlist",
  orders: "velora.orders",
  account: "velora.account",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — state stays in memory */
  }
}

/** All totals are in the base currency (USD); display conversion happens in the UI. */
export function computeTotals(items: CartItem[], shippingOverride?: number): Totals {
  const { freeShippingThreshold, taxRate, flatShipping } = site.cartPage;
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const shipping =
    shippingOverride !== undefined
      ? shippingOverride
      : subtotal === 0 || subtotal >= freeShippingThreshold
        ? 0
        : flatShipping;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shipping,
    tax,
    total: Math.round((subtotal + shipping + tax) * 100) / 100,
  };
}

type StoreValue = {
  hydrated: boolean;
  cart: CartItem[];
  cartCount: number;
  totals: Totals;
  wishlist: string[];
  orders: Order[];
  account: Account | null;
  addToCart: (input: {
    slug: string;
    size: string;
    color: string;
    qty?: number;
    openDrawer?: boolean;
  }) => void;
  setQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  toggleWishlist: (slug: string) => void;
  isWishlisted: (slug: string) => boolean;
  moveToCart: (slug: string) => void;
  placeOrder: (input: { address: Address; payment: string; shipping: ShippingMethod }) => Order;
  reorder: (id: string) => number;
  advanceOrder: (id: string) => void;
  findOrder: (id: string) => Order | undefined;
  signIn: (account: Account) => void;
  signOut: () => void;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const itemKey = (slug: string, size: string, color: string) => `${slug}|${size}|${color}`;

function orderId() {
  const n = Math.floor(100000 + Math.random() * 899999);
  return `VLR-${n}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { currency, country } = useLocale();
  const [hydrated, setHydrated] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    setCart(read<CartItem[]>(KEYS.cart, []));
    setWishlist(read<string[]>(KEYS.wishlist, []));
    setOrders(read<Order[]>(KEYS.orders, []));
    setAccount(read<Account | null>(KEYS.account, null));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) write(KEYS.cart, cart);
  }, [cart, hydrated]);
  useEffect(() => {
    if (hydrated) write(KEYS.wishlist, wishlist);
  }, [wishlist, hydrated]);
  useEffect(() => {
    if (hydrated) write(KEYS.orders, orders);
  }, [orders, hydrated]);
  useEffect(() => {
    if (hydrated) write(KEYS.account, account);
  }, [account, hydrated]);

  const addToCart = useCallback(
    ({
      slug,
      size,
      color,
      qty = 1,
      openDrawer = false,
    }: {
      slug: string;
      size: string;
      color: string;
      qty?: number;
      openDrawer?: boolean;
    }) => {
      const product = getProduct(slug);
      if (!product) return;
      const key = itemKey(slug, size, color);
      setCart((prev) => {
        const found = prev.find((i) => i.key === key);
        if (found) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
        return [
          ...prev,
          {
            key,
            slug,
            name: product.name,
            image: product.image,
            unitPrice: product.price,
            size,
            color,
            qty,
          },
        ];
      });
      if (openDrawer) setCartOpen(true);
    },
    [],
  );

  const setQty = useCallback((key: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, qty } : i)),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback((slug: string) => {
    setWishlist((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }, []);

  const moveToCart = useCallback(
    (slug: string) => {
      const product = getProduct(slug);
      if (!product) return;
      addToCart({ slug, size: product.sizes[0] ?? "One size", color: product.colors[0]?.name ?? "Default" });
      setWishlist((prev) => prev.filter((s) => s !== slug));
    },
    [addToCart],
  );

  const placeOrder = useCallback(
    ({ address, payment, shipping }: { address: Address; payment: string; shipping: ShippingMethod }) => {
      const items = cart;
      const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
      const order: Order = {
        id: orderId(),
        createdAt: new Date().toISOString(),
        status: "Confirmed",
        items,
        address,
        payment,
        totals: computeTotals(items, shippingCost(shipping, subtotal)),
        trackingNumber: `VL${Math.floor(1000000000 + Math.random() * 8999999999)}`,
        carrier: "Velora Express",
        eta: new Date(Date.now() + shipping.maxDays * 86400000).toISOString(),
        shippingMethod: shipping.name,
        shippingWindow: deliveryEstimate(shipping),
        currency: {
          code: currency.code,
          symbol: currency.symbol,
          rate: currency.rate,
          decimals: currency.decimals,
        },
      };
      setOrders((prev) => [order, ...prev]);
      setCart([]);
      return order;
    },
    [cart, currency],
  );

  /** Push every still-available line of a past order back into the bag. */
  const reorder = useCallback(
    (id: string) => {
      const order = orders.find((o) => o.id === id);
      if (!order) return 0;
      let added = 0;
      setCart((prev) => {
        let next = [...prev];
        for (const line of order.items) {
          if (!getProduct(line.slug)) continue;
          added += 1;
          const key = itemKey(line.slug, line.size, line.color);
          const found = next.find((i) => i.key === key);
          next = found
            ? next.map((i) => (i.key === key ? { ...i, qty: i.qty + line.qty } : i))
            : [...next, { ...line, key }];
        }
        return next;
      });
      return added;
    },
    [orders],
  );

  const advanceOrder = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const next = orderStages[Math.min(orderStages.indexOf(o.status) + 1, orderStages.length - 1)];
        return { ...o, status: next as OrderStatus };
      }),
    );
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      hydrated,
      cart,
      cartCount: cart.reduce((n, i) => n + i.qty, 0),
      totals: computeTotals(
        cart,
        shippingCost(
          shippingMethods(country.code)[0]!,
          cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0),
        ),
      ),
      wishlist,
      orders,
      account,
      addToCart,
      setQty,
      removeItem,
      clearCart,
      toggleWishlist,
      isWishlisted: (slug: string) => wishlist.includes(slug),
      moveToCart,
      placeOrder,
      reorder,
      advanceOrder,
      findOrder: (id: string) => orders.find((o) => o.id.toLowerCase() === id.toLowerCase()),
      signIn: setAccount,
      signOut: () => setAccount(null),
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
    }),
    [
      hydrated,
      cart,
      cartOpen,
      country,
      wishlist,
      orders,
      account,
      addToCart,
      setQty,
      removeItem,
      clearCart,
      toggleWishlist,
      moveToCart,
      placeOrder,
      reorder,
      advanceOrder,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
