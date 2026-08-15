/**
 * This is a helper file to ensure admin routes are wrapped with the layout
 * Copy the content of this file and use it to properly nest admin routes
 */

// The issue: admin routes like admin/index.tsx use createFileRoute("/admin/")
// But they should be nested under admin/route.tsx which has the sidebar

// To fix this, each admin route file should import from admin/route.tsx as parent
// OR rename admin/route.tsx to admin.tsx to match the folder name

// The correct structure should be:
// web/src/routes/admin.tsx (not route.tsx)
// This makes TanStack Router use it as the parent layout

// For now, here's a workaround - we'll create a simple middleware that wraps all admin routes

import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

export default function AdminWrapper() {
  useEffect(() => {
    // If we're on an admin path, inject the sidebar
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/')) {
      // Inject sidebar styles
      const style = document.createElement('style');
      style.textContent = `
        .admin-sidebar {
          width: 260px;
          background: #1a1a1a;
          color: white;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 100;
          overflow-y: auto;
        }
        .admin-content {
          margin-left: 260px;
        }
      `;
      document.head.appendChild(style);

      // Inject sidebar HTML
      const sidebar = document.createElement('div');
      sidebar.className = 'admin-sidebar';
      sidebar.innerHTML = `
        <div style="padding: 24px;">
          <h1 style="font-size: 20px; font-weight: 700; margin: 0;">Modest Apparel</h1>
          <p style="font-size: 12px; color: #9ca3af; margin: 4px 0 0 0;">Admin Panel</p>
        </div>
        <nav style="padding: 16px;">
          <a href="/admin" style="display: block; padding: 12px; color: white; text-decoration: none;">Dashboard</a>
          <a href="/admin/products" style="display: block; padding: 12px; color: #d1d5db; text-decoration: none;">Products</a>
          <a href="/admin/orders" style="display: block; padding: 12px; color: #d1d5db; text-decoration: none;">Orders</a>
          <a href="/admin/customers" style="display: block; padding: 12px; color: #d1d5db; text-decoration: none;">Customers</a>
          <a href="/admin/content/pages" style="display: block; padding: 12px; color: #d1d5db; text-decoration: none;">Content</a>
          <a href="/admin/discounts" style="display: block; padding: 12px; color: #d1d5db; text-decoration: none;">Marketing</a>
          <a href="/admin/settings/currency" style="display: block; padding: 12px; color: #d1d5db; text-decoration: none;">Localization</a>
          <a href="/admin/settings/payments" style="display: block; padding: 12px; color: #d1d5db; text-decoration: none;">Payments</a>
          <a href="/admin/settings/shipping" style="display: block; padding: 12px; color: #d1d5db; text-decoration: none;">Shipping</a>
          <a href="/admin/settings/store" style="display: block; padding: 12px; color: #d1d5db; text-decoration: none;">Settings</a>
          <a href="/admin/staff" style="display: block; padding: 12px; color: #d1d5db; text-decoration: none;">Staff</a>
          <a href="/admin/audit" style="display: block; padding: 12px; color: #d1d5db; text-decoration: none;">Reports</a>
        </nav>
      `;
      document.body.insertBefore(sidebar, document.body.firstChild);

      // Inject content wrapper
      const content = document.createElement('div');
      content.className = 'admin-content';
      content.style.padding = '32px';

      // Move document body content inside
      while (document.body.firstChild && document.body.firstChild !== sidebar) {
        content.appendChild(document.body.firstChild.cloneNode(true));
        document.body.removeChild(document.body.firstChild);
      }

      document.body.appendChild(content);
    }
  }, []);

  return <Outlet />;
}