import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Modest Apparel Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [stats, setStats] = useState({
    orders: 0,
    products: 0,
    customers: 0,
    revenue: 0
  });

  const recentOrders = [
    { id: "MA-001", customer: "John Doe", amount: 125.00, status: "Pending" },
    { id: "MA-002", customer: "Jane Smith", amount: 89.50, status: "Processing" },
    { id: "MA-003", customer: "Bob Johnson", amount: 245.00, status: "Shipped" },
  ];

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
          Welcome back!
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          Here's what's happening with your store today.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value="156"
          change="+12%"
          positive={true}
        />
        <StatCard
          icon={Package}
          label="Products"
          value="48"
          change="+3%"
          positive={true}
        />
        <StatCard
          icon={Users}
          label="Customers"
          value="234"
          change="+8%"
          positive={true}
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value="$12,450"
          change="+15%"
          positive={true}
        />
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <ActionButton href="/admin/products" label="Add Product" />
          <ActionButton href="/admin/orders" label="View Orders" />
          <ActionButton href="/admin/content/pages" label="Edit Content" />
          <ActionButton href="/admin/settings/store" label="Store Settings" />
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
          Recent Orders
        </h2>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Order</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Customer</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Amount</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, i) => (
                <tr key={order.id} style={{ borderBottom: i < recentOrders.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>{order.id}</td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: '#374151' }}>{order.customer}</td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: '#374151' }}>${order.amount.toFixed(2)}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: order.status === 'Shipped' ? '#d1fae5' : order.status === 'Processing' ? '#dbeafe' : '#fef3c7',
                      color: order.status === 'Shipped' ? '#059669' : order.status === 'Processing' ? '#2563eb' : '#d97706'
                    }}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Menu Items Reminder */}
      <div style={{ marginTop: '30px', padding: '20px', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fcd34d' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <AlertCircle style={{ width: '20px', height: '20px', color: '#d97706' }} />
          <span style={{ fontWeight: '600', color: '#92400e' }}>Admin Menu Options</span>
        </div>
        <p style={{ fontSize: '14px', color: '#92400e', margin: 0, lineHeight: '1.6' }}>
          Use the sidebar on the left to navigate: <strong>Products</strong>, <strong>Orders</strong>, <strong>Customers</strong>,
          <strong>Content</strong>, <strong>Marketing</strong>, <strong>Localization</strong>, <strong>Payments</strong>,
          <strong>Shipping</strong>, <strong>Settings</strong>, <strong>Staff</strong>, and <strong>Reports</strong>.
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, change, positive }: { icon: any, label: string, value: string, change: string, positive: boolean }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: '#fef3c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon style={{ width: '20px', height: '20px', color: '#d97706' }} />
        </div>
        <span style={{
          fontSize: '12px',
          fontWeight: '600',
          color: positive ? '#059669' : '#dc2626',
          background: positive ? '#d1fae5' : '#fee2e2',
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          {change}
        </span>
      </div>
      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>{value}</p>
    </div>
  );
}

function ActionButton({ href, label }: { href: string, label: string }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-block',
        padding: '10px 20px',
        background: '#1a1a1a',
        color: 'white',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'background 0.2s'
      }}
    >
      {label}
    </a>
  );
}