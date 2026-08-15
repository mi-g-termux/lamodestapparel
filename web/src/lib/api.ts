/**
 * The single place the browser talks to the server.
 *
 * Everything is same-origin (`/api/...`) so the app works identically on
 * Vercel, cPanel, Docker or localhost with no build-time URL to configure.
 * Cookies carry the session; a CSRF token is echoed back on every write.
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export function currentCurrency(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem("velora_currency") ?? "";
}

export function setCurrentCurrency(code: string): void {
  if (typeof localStorage !== "undefined") localStorage.setItem("velora_currency", code);
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  raw?: boolean;
};

async function request<T>(pathname: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };

  const currency = currentCurrency();
  if (currency) headers["x-currency"] = currency;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const token = readCookie("velora_csrf");
    if (token) headers["x-csrf-token"] = token;
  }

  // Built up conditionally rather than passing `undefined` values: the web
  // tsconfig uses `exactOptionalPropertyTypes`, so an explicit `undefined` is
  // not the same as an absent key.
  const init: RequestInit = {
    method,
    headers,
    credentials: "same-origin",
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  if (options.signal) init.signal = options.signal;

  const response = await fetch(pathname, init);

  if (options.raw) return response as unknown as T;

  const text = await response.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new ApiError(String(data["error"] ?? `Request failed (${response.status})`), response.status);
  }
  return data as T;
}

export const api = {
  get: <T>(pathname: string, signal?: AbortSignal) => request<T>(pathname, signal ? { signal } : {}),
  post: <T>(pathname: string, body?: unknown) => request<T>(pathname, { method: "POST", body }),
  patch: <T>(pathname: string, body?: unknown) => request<T>(pathname, { method: "PATCH", body }),
  put: <T>(pathname: string, body?: unknown) => request<T>(pathname, { method: "PUT", body }),
  del: <T>(pathname: string) => request<T>(pathname, { method: "DELETE" }),
};

/* ------------------------------------------------------------------ *
 * Storefront
 * ------------------------------------------------------------------ */

export type Money = { minor: number; formatted: string; currency?: string; base_minor?: number };

export type StoreProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: Money;
  compare_at: Money | null;
  images: Array<{ url: string; alt: string }>;
  categories: Array<{ slug: string; name: string }>;
  in_stock: boolean;
  stock: number;
  featured: boolean;
  variants?: Array<{ id: string; title: string; price: Money; stock: number; sku: string | null }>;
  reviews?: Array<{ author: string; rating: number; title: string | null; body: string; created_at: string }>;
};

export type Bootstrap = {
  branding: Record<string, string>;
  store_profile: Record<string, string>;
  theme: Record<string, string>;
  seo: Record<string, string>;
  features: Record<string, boolean | string>;
  social: Record<string, string>;
  legal: Record<string, string>;
  shipping: Record<string, unknown>;
  payments: Record<string, unknown>;
  navigation: {
    header: Array<{ id: string; label: string; href: string; position: number }>;
    footer: Array<{ id: string; menu: string; label: string; href: string; position: number }>;
  };
  pricing: {
    base: string;
    display: string;
    rate: number;
    symbol: string;
    decimals: number;
    detectedCountry: string | null;
    available: Array<{ code: string; symbol: string; name: string; rate: number }>;
  };
  maintenance?: boolean;
  message?: string;
};

export const storefront = {
  bootstrap: () => api.get<Bootstrap>("/api/public/bootstrap"),
  banners: (placement?: string) =>
    api.get<{ banners: Array<Record<string, string>> }>(
      `/api/public/banners${placement ? `?placement=${encodeURIComponent(placement)}` : ""}`,
    ),
  products: (params: Record<string, string | number | boolean> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== "" && v !== undefined) qs.set(k, String(v));
    return api.get<{ products: StoreProduct[]; total: number }>(`/api/public/products?${qs.toString()}`);
  },
  product: (slug: string) => api.get<{ product: StoreProduct }>(`/api/public/products/${encodeURIComponent(slug)}`),
  categories: () =>
    api.get<{ categories: Array<{ slug: string; name: string; image_url: string | null; product_count: number }> }>(
      "/api/public/categories",
    ),
  testimonials: () => api.get<{ testimonials: Array<Record<string, unknown>> }>("/api/public/testimonials"),
  page: (slug: string) => api.get<{ page: Record<string, string> }>(`/api/public/pages/${encodeURIComponent(slug)}`),
  currencies: () => api.get<Bootstrap["pricing"]>("/api/public/currencies"),
  checkout: (payload: unknown) => api.post<{ orderId: string; number: string }>("/api/public/checkout", payload),
  lookupOrder: (number: string, email: string) =>
    api.get<{ order: Record<string, unknown>; items: Array<Record<string, unknown>>; history: Array<Record<string, unknown>> }>(
      `/api/public/orders/lookup?number=${encodeURIComponent(number)}&email=${encodeURIComponent(email)}`,
    ),
  invoiceUrl: (orderId: string, email: string) =>
    `/api/public/orders/${encodeURIComponent(orderId)}/invoice.pdf?email=${encodeURIComponent(email)}`,
  newsletter: (email: string) => api.post<{ ok: true }>("/api/public/newsletter", { email }),
  contact: (payload: unknown) => api.post<{ ok: true }>("/api/public/contact", payload),
  review: (payload: unknown) => api.post<{ ok: true }>("/api/public/reviews", payload),
  backInStock: (payload: unknown) => api.post<{ ok: true }>("/api/public/back-in-stock", payload),
  validateCoupon: (code: string, subtotalMinor: number) =>
    api.post<{ ok: true; code: string; type: string; discountMinor: number }>("/api/public/coupons/validate", {
      code,
      subtotalMinor,
    }),
};

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  overrides: string[];
  avatar_url?: string | null;
};

export const adminApi = {
  login: (email: string, password: string) =>
    api.post<{ user: AdminUser; mustChangePassword: boolean }>("/api/admin/auth/login", { email, password }),
  logout: () => api.post<{ ok: true }>("/api/admin/auth/logout"),
  me: () => api.get<{ user: AdminUser; permissions: string[] }>("/api/admin/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ ok: true }>("/api/admin/auth/change-password", { currentPassword, newPassword }),

  dashboard: (granularity = "day", days = 30) =>
    api.get<{
      currency: { base: string; symbol: string; decimals: number };
      summary: Record<string, number>;
      revenueSeries: Array<{ period: string; revenue_minor: number; orders: number }>;
      topProducts: Array<{ title: string; units: number; revenue_minor: number }>;
      recentOrders: Array<Record<string, unknown>>;
    }>(`/api/admin/dashboard?granularity=${granularity}&days=${days}`),
  revenueReport: (granularity = "month", days = 365) =>
    api.get<{ series: Array<{ period: string; revenue_minor: number; orders: number }> }>(
      `/api/admin/reports/revenue?granularity=${granularity}&days=${days}`,
    ),

  notifications: () =>
    api.get<{ notifications: Array<Record<string, unknown>>; unread: number }>("/api/admin/notifications"),
  markNotificationsRead: (id?: string) => api.post<{ ok: true }>("/api/admin/notifications/read", { id }),

  products: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== "") qs.set(k, String(v));
    return api.get<{ products: Array<Record<string, unknown>>; total: number }>(`/api/admin/products?${qs}`);
  },
  product: (id: string) => api.get<Record<string, unknown>>(`/api/admin/products/${id}`),
  createProduct: (payload: unknown) => api.post<{ id: string; slug: string }>("/api/admin/products", payload),
  updateProduct: (id: string, payload: unknown) => api.patch<{ ok: true }>(`/api/admin/products/${id}`, payload),
  deleteProduct: (id: string) => api.del<{ ok: true }>(`/api/admin/products/${id}`),

  orders: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== "") qs.set(k, String(v));
    return api.get<{ orders: Array<Record<string, unknown>>; total: number; statuses: Record<string, string[]> }>(
      `/api/admin/orders?${qs}`,
    );
  },
  order: (id: string) => api.get<Record<string, unknown>>(`/api/admin/orders/${id}`),
  updateOrder: (id: string, payload: unknown) => api.patch<{ ok: true }>(`/api/admin/orders/${id}`, payload),
  refundOrder: (id: string, amountMinor: number, reason: string) =>
    api.post<{ ok: true }>(`/api/admin/orders/${id}/refund`, { amountMinor, reason }),
  /** Used by the Download invoice button in the Orders tab. */
  invoiceUrl: (id: string) => `/api/admin/orders/${id}/invoice.pdf`,

  customers: (q = "") => api.get<{ customers: Array<Record<string, unknown>> }>(`/api/admin/customers?q=${encodeURIComponent(q)}`),
  customer: (id: string) => api.get<Record<string, unknown>>(`/api/admin/customers/${id}`),

  banners: () => api.get<{ banners: Array<Record<string, unknown>> }>("/api/admin/banners"),
  createBanner: (payload: unknown) => api.post<{ id: string }>("/api/admin/banners", payload),
  updateBanner: (id: string, payload: unknown) => api.patch<{ ok: true }>(`/api/admin/banners/${id}`, payload),
  deleteBanner: (id: string) => api.del<{ ok: true }>(`/api/admin/banners/${id}`),

  pages: () => api.get<{ pages: Array<Record<string, unknown>> }>("/api/admin/pages"),
  savePage: (payload: unknown) => api.post<{ id: string }>("/api/admin/pages", payload),
  navigation: () => api.get<{ items: Array<Record<string, unknown>> }>("/api/admin/navigation"),
  saveNavigation: (items: unknown[]) => api.put<{ ok: true }>("/api/admin/navigation", { items }),

  settings: () => api.get<{ settings: Record<string, Record<string, unknown>>; namespaces: string[] }>("/api/admin/settings"),
  saveSettings: (namespace: string, patch: Record<string, unknown>) =>
    api.put<{ ok: true; settings: Record<string, unknown> }>(`/api/admin/settings/${namespace}`, patch),
  previewOrderNumber: (orders: Record<string, unknown>) =>
    api.post<{ preview: string }>("/api/admin/settings/orders/preview", orders),

  features: () => api.get<{ features: Record<string, boolean>; defaults: Record<string, boolean> }>("/api/admin/features"),
  toggleFeature: (key: string, value: boolean) => api.post<{ ok: true }>("/api/admin/features/toggle", { key, value }),

  testSmtp: (to: string) => api.post<{ ok: boolean; error?: string }>("/api/admin/smtp/test", { to }),
  rates: () => api.get<{ base: string; rates: Record<string, number>; rows: Array<Record<string, unknown>>; supported: Array<Record<string, unknown>> }>("/api/admin/currency/rates"),
  refreshRates: () => api.post<{ ok: boolean; updated?: number; error?: string }>("/api/admin/currency/refresh"),
  setRate: (base: string, quote: string, rate: number) => api.put<{ ok: true }>("/api/admin/currency/rate", { base, quote, rate }),

  media: (folder = "") => api.get<{ media: Array<Record<string, unknown>> }>(`/api/admin/media?folder=${encodeURIComponent(folder)}`),
  linkMedia: (url: string, folder = "misc", alt = "") => api.post<{ id: string; url: string }>("/api/admin/media/link", { url, folder, alt }),
  deleteMedia: (id: string) => api.del<{ ok: true }>(`/api/admin/media/${id}`),
  async uploadMedia(files: FileList | File[], folder = "misc"): Promise<Array<Record<string, unknown>>> {
    const form = new FormData();
    for (const file of Array.from(files)) form.append("files", file);
    form.append("folder", folder);
    const response = await fetch("/api/admin/media/upload", {
      method: "POST",
      body: form,
      credentials: "same-origin",
      headers: { "x-csrf-token": readCookie("velora_csrf") },
    });
    const data = (await response.json()) as { media?: Array<Record<string, unknown>>; error?: string };
    if (!response.ok) throw new ApiError(data["error"] ?? "Upload failed", response.status);
    return data["media"] ?? [];
  },

  coupons: () => api.get<{ coupons: Array<Record<string, unknown>> }>("/api/admin/coupons"),
  saveCoupon: (payload: unknown) => api.post<{ id: string }>("/api/admin/coupons", payload),
  deleteCoupon: (id: string) => api.del<{ ok: true }>(`/api/admin/coupons/${id}`),

  subscribers: () => api.get<{ subscribers: Array<Record<string, unknown>> }>("/api/admin/subscribers"),
  messages: () => api.get<{ messages: Array<Record<string, unknown>> }>("/api/admin/messages"),
  reviews: () => api.get<{ reviews: Array<Record<string, unknown>> }>("/api/admin/reviews"),
  moderateReview: (id: string, state: string) => api.patch<{ ok: true }>(`/api/admin/reviews/${id}`, { state }),

  staff: () => api.get<{ staff: Array<Record<string, unknown>>; roles: string[]; permissions: string[] }>("/api/admin/staff"),
  createStaff: (payload: unknown) => api.post<{ id: string }>("/api/admin/staff", payload),
  updateStaff: (id: string, payload: unknown) => api.patch<{ ok: true }>(`/api/admin/staff/${id}`, payload),

  audit: (limit = 200) => api.get<{ entries: Array<Record<string, unknown>> }>(`/api/admin/audit?limit=${limit}`),
  system: () => api.get<Record<string, unknown>>("/api/admin/system"),
  clearCache: () => api.post<{ ok: true }>("/api/admin/system/cache/clear"),
  revokeSessions: () => api.post<{ ok: true }>("/api/admin/system/sessions/revoke-all"),
};

/* ------------------------------------------------------------------ *
 * Money helpers shared by both apps
 * ------------------------------------------------------------------ */

export function formatMinor(minor: number, currency: string, decimals = 2): string {
  const value = minor / 10 ** decimals;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: decimals }).format(value);
  } catch {
    return `${currency} ${value.toFixed(decimals)}`;
  }
}
