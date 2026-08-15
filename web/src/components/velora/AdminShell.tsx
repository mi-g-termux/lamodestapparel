/**
 * App shell (§5): grouped sidebar with badge counts and a locked SYSTEM group,
 * off-canvas drawer under 1024px, topbar with global search, command palette,
 * notifications, user menu and environment badge, plus breadcrumbs.
 */
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Boxes,
  ChevronDown,
  ClipboardList,
  Command,
  CreditCard,
  Gauge,
  Image as ImageIcon,
  LayoutTemplate,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Package,
  Palette,
  Percent,
  Search,
  ShoppingBag,
  Star,
  Store,
  Truck,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAdminState, useCan, useCurrentUser, logout } from "@/lib/velora/store";
import type { Permission } from "@/lib/velora/permissions";
import { Breadcrumbs, IconButton, InlineBanner, relativeTime } from "./kit";
import { CommandPalette } from "./CommandPalette";

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  permission: Permission;
  badge?: (s: ReturnType<typeof useAdminState>) => number;
};

type NavGroup = { label: string; items: NavItem[]; locked?: boolean };

const icon = (I: typeof Gauge) => <I className="size-4 shrink-0" aria-hidden />;

export const navGroups: NavGroup[] = [
  {
    label: "Sell",
    items: [
      { to: "/admin", label: "Dashboard", icon: icon(Gauge), permission: "dashboard.view" },
      {
        to: "/admin/orders",
        label: "Orders",
        icon: icon(ShoppingBag),
        permission: "order.read",
        badge: (s) => s.orders.filter((o) => o.status === "Pending" || o.status === "Confirmed").length,
      },
      { to: "/admin/drafts", label: "Draft orders", icon: icon(ClipboardList), permission: "order.create" },
      {
        to: "/admin/abandoned",
        label: "Abandoned carts",
        icon: icon(ShoppingBag),
        permission: "marketing.write",
        badge: (s) => s.abandonedCarts.filter((c) => !c.recovered).length,
      },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { to: "/admin/products", label: "Products", icon: icon(Package), permission: "product.read" },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/admin/customers", label: "Customers", icon: icon(Users), permission: "customer.read" },
      { to: "/admin/subscribers", label: "Subscribers", icon: icon(Mail), permission: "marketing.write" },
      { to: "/admin/back-in-stock", label: "Back-in-stock", icon: icon(Bell), permission: "marketing.write" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/admin/discounts", label: "Discounts", icon: icon(Percent), permission: "marketing.write" },
    ],
  },
  {
    label: "Content studio",
    items: [
      { to: "/admin/content/brand", label: "Brand & logos", icon: icon(Store), permission: "content.write" },
      { to: "/admin/content/theme", label: "Theme & type", icon: icon(Palette), permission: "theme.write" },
      { to: "/admin/content/announcements", label: "Announcement bar", icon: icon(Megaphone), permission: "content.write" },
      { to: "/admin/content/header", label: "Header & navigation", icon: icon(LayoutTemplate), permission: "content.write" },
      { to: "/admin/content/hero", label: "Hero slider", icon: icon(ImageIcon), permission: "content.write" },
      { to: "/admin/content/home", label: "Homepage sections", icon: icon(LayoutTemplate), permission: "content.write" },
      { to: "/admin/content/promo", label: "Promo & banners", icon: icon(Megaphone), permission: "content.write" },
      { to: "/admin/content/testimonials", label: "Social proof", icon: icon(Star), permission: "content.write" },
      { to: "/admin/content/newsletter", label: "Newsletter block", icon: icon(Mail), permission: "content.write" },
      { to: "/admin/content/footer", label: "Footer & legal", icon: icon(LayoutTemplate), permission: "content.write" },
      { to: "/admin/content/pages", label: "Pages, FAQ & size guide", icon: icon(BookOpen), permission: "content.write" },
    ],
  },
  {
    label: "Settings",
    items: [
      { to: "/admin/settings/store", label: "Store profile", icon: icon(Store), permission: "settings.read" },
      { to: "/admin/settings/currency", label: "Currencies", icon: icon(CreditCard), permission: "settings.read" },
      { to: "/admin/settings/countries", label: "Countries & cities", icon: icon(Store), permission: "settings.read" },
      { to: "/admin/settings/shipping", label: "Shipping zones", icon: icon(Truck), permission: "settings.read" },
      { to: "/admin/settings/tax", label: "Tax rules", icon: icon(Percent), permission: "settings.read" },
      { to: "/admin/settings/payments", label: "Payments", icon: icon(CreditCard), permission: "settings.payments.read" },
      { to: "/admin/settings/orders", label: "Order rules", icon: icon(ClipboardList), permission: "settings.read" },
      { to: "/admin/settings/couriers", label: "Couriers", icon: icon(Truck), permission: "settings.read" },
    ],
  },
  {
    label: "System",
    locked: true,
    items: [
      { to: "/admin/staff", label: "Staff & roles", icon: icon(User), permission: "staff.manage" },
      { to: "/admin/audit", label: "Audit log", icon: icon(Lock), permission: "audit.view" },
      { to: "/admin/system", label: "System health", icon: icon(Boxes), permission: "system.manage" },
    ],
  },
];


export function AdminShell({
  children,
  trail,
}: {
  children: ReactNode;
  trail?: { label: string; to?: string }[];
}) {
  const state = useAdminState();
  const can = useCan();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [drawer, setDrawer] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDrawer(false), [pathname]);

  /* Focus trap for the mobile drawer */
  useEffect(() => {
    if (!drawer) return;
    const node = drawerRef.current;
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('a,button,[tabindex]:not([tabindex="-1"])') ?? []);
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "?" && e.shiftKey && !(e.target as HTMLElement)?.closest("input,textarea")) {
        e.preventDefault();
        void navigate({ to: "/admin" });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigate]);

  const groups = useMemo(
    () =>
      navGroups
        .map((g) => ({ ...g, items: g.items.filter((i) => can(i.permission)) }))
        .filter((g) => g.items.length > 0),
    [can],
  );

  const notifications = useMemo(
    () =>
      [
        ...state.orders.slice(0, 3).map((o) => ({ id: o.id, at: o.placedAt, text: `New order ${o.number} from ${o.customerName}` })),
        ...state.reviews
          .filter((r) => r.state === "Pending")
          .slice(0, 2)
          .map((r) => ({ id: r.id, at: r.at, text: `Review awaiting moderation from ${r.author}` })),
        ...state.messages
          .filter((m) => m.state === "Pending")
          .slice(0, 2)
          .map((m) => ({ id: m.id, at: m.at, text: `Unanswered message: ${m.subject}` })),
      ].sort((a, b) => (a.at < b.at ? 1 : -1)),
    [state],
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
        <Link to="/admin" className="min-w-0">
          <p className="serif text-[22px] leading-none tracking-[0.24em]">
            {state.content.brand.wordmark}
          </p>
          <p className="mt-1 text-[10px] tracking-[0.22em] text-muted uppercase">Admin panel</p>
        </Link>
        <IconButton
          label="Close navigation"
          icon={<X className="size-4" />}
          className="lg:hidden"
          onClick={() => setDrawer(false)}
        />
      </div>

      <nav aria-label="Admin sections" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {groups.map((group) => {
          const collapsed = group.locked && !systemOpen;
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => group.locked && setSystemOpen((s) => !s)}
                className={cn(
                  "flex w-full items-center gap-2 px-2 pb-1.5 text-left",
                  group.locked ? "cursor-pointer" : "cursor-default",
                )}
                aria-expanded={group.locked ? systemOpen : undefined}
              >
                {group.locked ? <Lock className="size-3 text-muted" aria-hidden /> : null}
                <span className="eyebrow">{group.label}</span>
                {group.locked ? (
                  <ChevronDown
                    className={cn("ml-auto size-3.5 text-muted transition-transform", systemOpen && "rotate-180")}
                    aria-hidden
                  />
                ) : null}
              </button>
              {!collapsed ? (
                <ul className={cn("space-y-0.5", group.locked && "rounded-[12px] bg-dev-zone p-1")}>
                  {group.items.map((item) => {
                    const count = item.badge?.(state) ?? 0;
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          activeOptions={{ exact: item.to === "/admin" }}
                          className="flex min-h-[40px] items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-cream hover:text-ink"
                          activeProps={{ className: "bg-ink text-surface hover:bg-ink hover:text-surface" }}
                        >
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                          {count > 0 ? (
                            <span className="tnum ml-auto rounded-full bg-gold-soft px-1.5 py-0.5 text-[11px] text-gold">
                              {count}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line p-4 text-[12px]">
        <p className="font-medium">{state.settings.store.displayName}</p>
        <p className="truncate text-muted">{state.settings.store.supportEmail}</p>
        <p className="mt-1 text-muted">Settings v{state.settings.settingsVersion}</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-[264px] shrink-0 border-r border-line lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {drawer ? (
        <>
          <div className="fixed inset-0 z-40 bg-ink/50 lg:hidden" onClick={() => setDrawer(false)} />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 w-[min(88vw,300px)] border-r border-line lg:hidden"
          >
            {sidebar}
          </div>
        </>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
          <div className="flex items-center gap-2 px-4 py-2.5 sm:px-6">
            <IconButton
              label="Open navigation"
              icon={<Menu className="size-4" />}
              className="lg:hidden"
              onClick={() => setDrawer(true)}
            />
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex min-h-[38px] min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-surface px-3 text-left text-[13px] text-muted hover:border-gold sm:max-w-sm"
            >
              <Search className="size-4 shrink-0" aria-hidden />
              <span className="truncate">Search orders, products, customers…</span>
              <span className="ml-auto hidden items-center gap-1 text-[11px] sm:flex">
                <Command className="size-3" aria-hidden />K
              </span>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <span
                className={cn(
                  "pill hidden sm:inline-flex",
                  state.settings.environment === "production" ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn",
                )}
              >
                {state.settings.environment}
              </span>

              <div className="relative">
                <IconButton
                  label="Notifications"
                  icon={<Bell className="size-4" />}
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-expanded={notifOpen}
                />
                {notifications.length > 0 ? (
                  <span className="pointer-events-none absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-bad text-[10px] text-surface">
                    {notifications.length}
                  </span>
                ) : null}
                {notifOpen ? (
                  <div className="card absolute right-0 z-40 mt-2 w-[min(90vw,320px)] p-2 shadow-lg">
                    <p className="eyebrow px-2 py-1">Notifications</p>
                    <ul className="max-h-72 overflow-y-auto">
                      {notifications.map((n) => (
                        <li key={n.id} className="rounded-[8px] px-2 py-2 text-[13px] hover:bg-cream">
                          {n.text}
                          <span className="block text-[11px] text-muted">{relativeTime(n.at)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  onClick={() => setUserOpen((v) => !v)}
                  aria-expanded={userOpen}
                  className="flex min-h-[38px] items-center gap-2 rounded-[10px] border border-line bg-surface px-2.5 text-[13px] hover:border-gold"
                >
                  <User className="size-4" aria-hidden />
                  <span className="hidden max-w-[12ch] truncate sm:inline">{user?.name ?? "Signed out"}</span>
                  <ChevronDown className="size-3.5 text-muted" aria-hidden />
                </button>
                {userOpen ? (
                  <div className="card absolute right-0 z-40 mt-2 w-56 p-2 shadow-lg">
                    <p className="px-2 py-1 text-[12px] text-muted">
                      {user?.email} · {user?.role}
                    </p>
                    <Link to="/admin" className="block rounded-[8px] px-2 py-2 text-[13px] hover:bg-cream">
                      My profile
                    </Link>
                    <Link to="/admin" className="block rounded-[8px] px-2 py-2 text-[13px] hover:bg-cream">
                      Keyboard shortcuts
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        window.location.assign("/admin/login");
                      }}
                      className="flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-left text-[13px] text-bad hover:bg-bad-bg"
                    >
                      <LogOut className="size-3.5" aria-hidden /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {trail && trail.length > 0 ? (
            <div className="px-4 pb-2.5 sm:px-6">
              <Breadcrumbs trail={trail} />
            </div>
          ) : null}
        </header>

        <main className="min-w-0 flex-1 space-y-5 px-4 py-5 sm:px-6 sm:py-6">
          {state.settings.maintenance.on ? (
            <InlineBanner
              tone="warn"
              title="Maintenance mode is ON"
              body="Shoppers see the maintenance page. Admins bypass it."
            />
          ) : null}
          {!state.settings.smtp.configured ? (
            <InlineBanner tone="warn" title="SMTP is not configured" body="Transactional emails will not send." />
          ) : null}
          {state.settings.payments.some((p) => p.enabled && p.mode === "test") ? (
            <InlineBanner
              tone="info"
              title="A payment provider is in test mode"
              body="Live charges will not be taken for providers marked test."
            />
          ) : null}
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
