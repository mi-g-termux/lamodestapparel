/**
 * Admin Layout with integrated theme from velora-admin-panel-v4
 * This is the main admin shell that wraps all admin pages
 */

import { Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  Settings, FileText, CreditCard, Truck, Globe,
  Megaphone, BarChart3, UserCog, Bell, Menu, X,
  ChevronLeft, ChevronRight, LogOut, Search
} from "lucide-react";
import { useCurrentUser, useAdminState } from "@/lib/velora/store";

// Navigation items for admin sidebar
const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin", exact: true },
  { icon: Package, label: "Products", href: "/admin/products" },
  { icon: ShoppingCart, label: "Orders", href: "/admin/orders" },
  { icon: Users, label: "Customers", href: "/admin/customers" },
  { icon: FileText, label: "Pages", href: "/admin/content/pages" },
  { icon: Megaphone, label: "Marketing", href: "/admin/discounts" },
  { icon: Globe, label: "Localization", href: "/admin/settings/currency" },
  { icon: CreditCard, label: "Payments", href: "/admin/settings/payments" },
  { icon: Truck, label: "Shipping", href: "/admin/settings/shipping" },
  { icon: Settings, label: "Settings", href: "/admin/settings/store" },
  { icon: UserCog, label: "Staff", href: "/admin/staff" },
  { icon: BarChart3, label: "Reports", href: "/admin/audit" },
  { icon: Bell, label: "Alerts", href: "/admin/back-in-stock" },
];

export function AdminLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Check if current route matches nav item
  const isActive = (href: string, exact = false) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-slate-800">Admin Panel</h1>
        </div>

        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products, orders, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-slate-100 rounded-lg relative">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <AdminUserMenu />
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 bottom-0 bg-white border-r border-slate-200 z-40 transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-64"
        } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);

            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-amber-50 text-amber-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-amber-600" : ""}`} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </a>
            );
          })}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute bottom-4 right-0 translate-x-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        }`}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function AdminUserMenu() {
  const user = useCurrentUser();
  const state = useAdminState();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg"
      >
        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
          <span className="text-sm font-medium text-amber-700">
            {user.name?.[0] || user.email[0].toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium text-slate-700 hidden sm:block">
          {user.name || "Admin"}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-900">{user.name || "Admin"}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <a
              href="/admin/settings/store"
              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Settings className="w-4 h-4" />
              Settings
            </a>
            <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminLayout;