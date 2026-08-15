import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, ShoppingCart, Users, FileText,
  Megaphone, Globe, CreditCard, Truck, Settings,
  UserCog, BarChart3, Bell, ChevronRight
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

export default function AdminLayout() {
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin", color: "#f59e0b" },
    { icon: Package, label: "Products", href: "/admin/products", color: "#10b981" },
    { icon: ShoppingCart, label: "Orders", href: "/admin/orders", color: "#3b82f6" },
    { icon: Users, label: "Customers", href: "/admin/customers", color: "#8b5cf6" },
    { icon: FileText, label: "Content Pages", href: "/admin/content/pages", color: "#ec4899" },
    { icon: Megaphone, label: "Marketing", href: "/admin/discounts", color: "#f97316" },
    { icon: Globe, label: "Localization", href: "/admin/settings/currency", color: "#06b6d4" },
    { icon: CreditCard, label: "Payments", href: "/admin/settings/payments", color: "#14b8a6" },
    { icon: Truck, label: "Shipping", href: "/admin/settings/shipping", color: "#6366f1" },
    { icon: Settings, label: "Store Settings", href: "/admin/settings/store", color: "#64748b" },
    { icon: UserCog, label: "Staff & Users", href: "/admin/staff", color: "#eab308" },
    { icon: BarChart3, label: "Reports", href: "/admin/audit", color: "#0ea5e9" },
    { icon: Bell, label: "Alerts", href: "/admin/back-in-stock", color: "#f43f5e" },
  ];

  if (typeof window === 'undefined') {
    return <Outlet />;
  }

  const currentPath = window.location.pathname;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}>
      {/* SIDEBAR */}
      <aside style={{
        width: '260px',
        background: '#1a1a1a',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 4px 0'
          }}>
            Modest Apparel
          </h1>
          <p style={{
            fontSize: '12px',
            color: '#9ca3af',
            margin: 0
          }}>
            Admin Panel
          </p>
        </div>

        {/* Menu */}
        <nav style={{
          flex: 1,
          padding: '16px 12px',
          overflowY: 'auto'
        }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href || (item.href !== '/admin' && currentPath.startsWith(item.href));

            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  marginBottom: '4px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: isActive ? 'white' : '#d1d5db',
                  background: isActive ? item.color : 'transparent',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                <Icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight style={{ width: '16px', height: '16px', marginLeft: 'auto' }} />
                )}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          © 2026 Modest Apparel
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{
        flex: 1,
        marginLeft: '260px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        {/* Top Header */}
        <header style={{
          height: '64px',
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Admin Dashboard
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              admin@modestapparel.com
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              background: '#f59e0b',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{
          flex: 1,
          padding: '32px',
          overflow: 'auto'
        }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}