// Branded email templates.
// Each template is a pure function returning { subject, html } so it can be
// handed to any sending provider (Lovable Emails, Resend, SES) without change.
// Inline styles only — email clients ignore external CSS.

import { formatPrice, site } from "@/content/site";

export type EmailResult = { subject: string; html: string; preheader: string };

const ink = "#1C1A18";
const cream = "#F7F2EA";
const gold = "#A5794E";
const border = "#E7DFD3";
const muted = "#6B6459";
const font = "'Jost', 'Helvetica Neue', Arial, sans-serif";

function layout({
  preheader,
  heading,
  intro,
  body = "",
  cta,
}: {
  preheader: string;
  heading: string;
  intro: string;
  body?: string;
  cta?: { label: string; href: string };
}) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:${font};color:${ink};">
<span style="display:none;font-size:1px;color:#ffffff;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;border:1px solid ${border};">
    <tr><td align="center" style="background:${cream};padding:28px 24px;border-bottom:1px solid ${border};">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:8px;color:${ink};">${site.brand.name}</div>
      <div style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:${muted};margin-top:6px;">${site.brand.tagline}</div>
    </td></tr>
    <tr><td style="padding:32px 32px 8px 32px;">
      <h1 style="margin:0 0 12px 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:500;color:${ink};">${heading}</h1>
      <p style="margin:0;font-size:14px;line-height:1.7;color:${muted};">${intro}</p>
    </td></tr>
    ${body ? `<tr><td style="padding:20px 32px 0 32px;">${body}</td></tr>` : ""}
    ${
      cta
        ? `<tr><td style="padding:28px 32px 32px 32px;">
      <a href="${cta.href}" style="display:inline-block;background:${ink};color:#ffffff;text-decoration:none;padding:14px 28px;font-size:11px;letter-spacing:3px;text-transform:uppercase;">${cta.label}</a>
    </td></tr>`
        : `<tr><td style="padding:0 32px 32px 32px;"></td></tr>`
    }
    <tr><td style="background:${cream};padding:22px 32px;border-top:1px solid ${border};font-size:11px;line-height:1.8;color:${muted};">
      ${site.company.legalName} · ${site.company.address}<br>
      <a href="mailto:${site.company.email}" style="color:${gold};text-decoration:none;">${site.company.email}</a> · ${site.company.phone}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function itemRows(items: { name: string; size: string; color: string; qty: number; unitPrice: number }[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  ${items
    .map(
      (i) => `<tr>
    <td style="padding:12px 0;border-bottom:1px solid ${border};font-size:13px;color:${ink};">
      ${i.name}<br><span style="color:${muted};font-size:11px;">${i.color} · ${i.size} · Qty ${i.qty}</span>
    </td>
    <td align="right" style="padding:12px 0;border-bottom:1px solid ${border};font-size:13px;color:${ink};">${formatPrice(
      i.unitPrice * i.qty,
    )}</td>
  </tr>`,
    )
    .join("")}
</table>`;
}

function totalsRows(t: { subtotal: number; shipping: number; tax: number; total: number }) {
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:6px 0;font-size:${strong ? 14 : 12}px;color:${strong ? ink : muted};">${label}</td>
     <td align="right" style="padding:6px 0;font-size:${strong ? 14 : 12}px;color:${ink};">${value}</td></tr>`;
  return `<table role="presentation" width="100%" style="margin-top:14px;border-collapse:collapse;">
    ${row("Subtotal", formatPrice(t.subtotal))}
    ${row("Shipping", t.shipping === 0 ? "Free" : formatPrice(t.shipping))}
    ${row("Estimated tax", formatPrice(t.tax))}
    ${row("Total", formatPrice(t.total), true)}
  </table>`;
}

/** Centred status hero used by the order status update email. */
function statusHero(status: string, orderId: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:4px 0 18px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td align="center" valign="middle" width="64" height="64" style="width:64px;height:64px;background:${gold};border-radius:32px;color:#ffffff;font-size:28px;line-height:64px;">&#10003;</td>
    </tr></table>
  </td></tr>
  <tr><td align="center" style="padding-bottom:6px;font-size:13px;color:${muted};">Order <strong style="color:${ink};">${orderId}</strong></td></tr>
  <tr><td align="center" style="padding:8px 0 4px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};background:${cream};">
      <tr><td align="center" style="padding:22px 16px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${muted};">Current status</div>
        <div style="margin-top:8px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${gold};">${status}</div>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

export type OrderEmailData = {
  orderId: string;
  customerName: string;
  items: { name: string; size: string; color: string; qty: number; unitPrice: number }[];
  totals: { subtotal: number; shipping: number; tax: number; total: number };
  trackingNumber?: string;
  carrier?: string;
  eta?: string;
  url: string;
};

export const emailTemplates = {
  "email-confirmation": {
    displayName: "Email confirmation",
    build: (d: { name: string; url: string }): EmailResult => ({
      subject: `Confirm your email address`,
      preheader: "One tap to confirm your Velora account.",
      html: layout({
        preheader: "One tap to confirm your Velora account.",
        heading: "Confirm your email",
        intro: `Hello ${d.name}, please confirm this address so we can secure your account and send order updates.`,
        cta: { label: "Confirm email", href: d.url },
      }),
    }),
  },
  welcome: {
    displayName: "Welcome",
    build: (d: { name: string; url: string }): EmailResult => ({
      subject: `Welcome to ${site.brand.name}`,
      preheader: "Your wardrobe, considered.",
      html: layout({
        preheader: "Your wardrobe, considered.",
        heading: `Welcome, ${d.name}`,
        intro:
          "Your account is ready. Save pieces to your wishlist, track orders and check out faster on every visit.",
        cta: { label: "Start shopping", href: d.url },
      }),
    }),
  },
  "password-reset": {
    displayName: "Password reset",
    build: (d: { name: string; url: string }): EmailResult => ({
      subject: "Reset your password",
      preheader: "This link expires in 60 minutes.",
      html: layout({
        preheader: "This link expires in 60 minutes.",
        heading: "Reset your password",
        intro: `Hello ${d.name}, use the button below to choose a new password. The link expires in 60 minutes. If you did not request this, no action is needed.`,
        cta: { label: "Choose new password", href: d.url },
      }),
    }),
  },
  "order-confirmation": {
    displayName: "Order confirmation",
    build: (d: OrderEmailData): EmailResult => ({
      subject: `Order ${d.orderId} confirmed`,
      preheader: `Thank you, ${d.customerName}. We're preparing your order.`,
      html: layout({
        preheader: `Thank you, ${d.customerName}. We're preparing your order.`,
        heading: "Order confirmed",
        intro: `Thank you, ${d.customerName}. Order <strong style="color:${ink}">${d.orderId}</strong> is confirmed and moving into production packing.`,
        body: itemRows(d.items) + totalsRows(d.totals),
        cta: { label: "View order", href: d.url },
      }),
    }),
  },
  "order-shipped": {
    displayName: "Order shipped",
    build: (d: OrderEmailData): EmailResult => ({
      subject: `Order ${d.orderId} has shipped`,
      preheader: "Your parcel is on the move.",
      html: layout({
        preheader: "Your parcel is on the move.",
        heading: "On its way",
        intro: `${d.carrier ?? "Velora Express"} has collected order <strong style="color:${ink}">${d.orderId}</strong>. Tracking number <strong style="color:${ink}">${d.trackingNumber ?? ""}</strong>${d.eta ? `, estimated arrival ${d.eta}` : ""}.`,
        body: itemRows(d.items),
        cta: { label: "Track parcel", href: d.url },
      }),
    }),
  },
  "order-status-update": {
    displayName: "Order status update",
    build: (d: { orderId: string; customerName: string; status: string; note?: string; url: string }): EmailResult => ({
      subject: `[${site.brand.name}] Order ${d.orderId} — ${d.status}`,
      preheader: `Your order is now ${d.status.toLowerCase()}.`,
      html: layout({
        preheader: `Your order is now ${d.status.toLowerCase()}.`,
        heading: "Order status updated",
        intro: `Hi ${d.customerName}, your order status has been updated. ${d.note ?? "Open the tracker for the latest checkpoint."}`,
        body: statusHero(d.status, d.orderId),
        cta: { label: "Track order", href: d.url },
      }),
    }),
  },
  "order-delivered": {
    displayName: "Order delivered",
    build: (d: OrderEmailData): EmailResult => ({
      subject: `Order ${d.orderId} delivered`,
      preheader: "Delivered. We hope it fits beautifully.",
      html: layout({
        preheader: "Delivered. We hope it fits beautifully.",
        heading: "Delivered",
        intro: `Order <strong style="color:${ink}">${d.orderId}</strong> was delivered. Returns and exchanges stay open for 14 days.`,
        body: itemRows(d.items),
        cta: { label: "Leave a review", href: d.url },
      }),
    }),
  },
  "order-cancelled": {
    displayName: "Order cancelled / refunded",
    build: (d: OrderEmailData): EmailResult => ({
      subject: `Refund issued for ${d.orderId}`,
      preheader: "Your refund is on its way back.",
      html: layout({
        preheader: "Your refund is on its way back.",
        heading: "Refund issued",
        intro: `Order <strong style="color:${ink}">${d.orderId}</strong> has been cancelled and ${formatPrice(
          d.totals.total,
        )} refunded to the original payment method. Banks usually post it within 5 working days.`,
        body: totalsRows(d.totals),
        cta: { label: "View receipt", href: d.url },
      }),
    }),
  },
  "contact-received": {
    displayName: "Contact form received",
    build: (d: { name: string; message: string; url: string }): EmailResult => ({
      subject: "We received your message",
      preheader: "Our care team replies within one working day.",
      html: layout({
        preheader: "Our care team replies within one working day.",
        heading: "Message received",
        intro: `Thank you ${d.name}. Our care team replies within one working day (${site.company.hours}).`,
        body: `<div style="border-left:2px solid ${gold};padding:4px 0 4px 14px;font-size:13px;line-height:1.7;color:${muted};">${d.message}</div>`,
        cta: { label: "Visit help centre", href: d.url },
      }),
    }),
  },
  "newsletter-confirmation": {
    displayName: "Newsletter confirmation",
    build: (d: { url: string }): EmailResult => ({
      subject: "You're on the Velora list",
      preheader: "Private sales and new collections first.",
      html: layout({
        preheader: "Private sales and new collections first.",
        heading: "You're on the list",
        intro:
          "You'll hear from us when a collection lands or a private sale opens — never more than twice a month.",
        cta: { label: "Explore new arrivals", href: d.url },
      }),
    }),
  },
} as const;

export type EmailTemplateName = keyof typeof emailTemplates;

const demoItems = [
  { name: "Floral Wrap Dress", size: "M", color: "Sand", qty: 1, unitPrice: 49.99 },
  { name: "Minimal Watch", size: "One size", color: "Gold", qty: 1, unitPrice: 29.99 },
];
const demoTotals = { subtotal: 79.98, shipping: 0, tax: 4.0, total: 83.98 };

/** Sample payloads used by the /emails preview gallery. */
export const emailPreviews: { name: EmailTemplateName; result: EmailResult }[] = [
  {
    name: "email-confirmation",
    result: emailTemplates["email-confirmation"].build({ name: "Amelia", url: `${site.company.site}/login` }),
  },
  { name: "welcome", result: emailTemplates.welcome.build({ name: "Amelia", url: `${site.company.site}/shop` }) },
  {
    name: "password-reset",
    result: emailTemplates["password-reset"].build({ name: "Amelia", url: `${site.company.site}/reset-password` }),
  },
  {
    name: "order-confirmation",
    result: emailTemplates["order-confirmation"].build({
      orderId: "VLR-482910",
      customerName: "Amelia",
      items: demoItems,
      totals: demoTotals,
      url: `${site.company.site}/track-order`,
    }),
  },
  {
    name: "order-shipped",
    result: emailTemplates["order-shipped"].build({
      orderId: "VLR-482910",
      customerName: "Amelia",
      items: demoItems,
      totals: demoTotals,
      trackingNumber: "VL4820193847",
      carrier: "Velora Express",
      eta: "Friday, 14 August",
      url: `${site.company.site}/track-order`,
    }),
  },
  {
    name: "order-status-update",
    result: emailTemplates["order-status-update"].build({
      orderId: "VLR-482910",
      customerName: "Amelia",
      status: "Shipped",
      note: "Check your order tracker for more details.",
      url: `${site.company.site}/track-order`,
    }),
  },
  {
    name: "order-delivered",
    result: emailTemplates["order-delivered"].build({
      orderId: "VLR-482910",
      customerName: "Amelia",
      items: demoItems,
      totals: demoTotals,
      url: `${site.company.site}/account`,
    }),
  },
  {
    name: "order-cancelled",
    result: emailTemplates["order-cancelled"].build({
      orderId: "VLR-482910",
      customerName: "Amelia",
      items: demoItems,
      totals: demoTotals,
      url: `${site.company.site}/account`,
    }),
  },
  {
    name: "contact-received",
    result: emailTemplates["contact-received"].build({
      name: "Amelia",
      message: "Could I exchange the linen shirt for a size up?",
      url: `${site.company.site}/faq`,
    }),
  },
  {
    name: "newsletter-confirmation",
    result: emailTemplates["newsletter-confirmation"].build({ url: `${site.company.site}/shop` }),
  },
];
