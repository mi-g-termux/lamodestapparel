import { query } from "./db.js";
import { getNamespace, getSettings } from "./settings.js";
import { sendMail, emailShell, button, escapeHtml } from "./mailer.js";
import { formatMoney } from "./fx.js";
import { env } from "./env.js";
/**
 * "Does the admin get told when someone orders?" — yes, three ways:
 *   1. a row in `notifications` → the bell in the admin header (polled live)
 *   2. an email to every address in Settings → Notifications
 *   3. a confirmation email to the customer
 * Each one has its own on/off switch in the admin panel.
 */
export async function pushNotification(args) {
    const n = await getNamespace("notifications");
    if (n.in_app_bell === false)
        return;
    await query(`insert into notifications (kind, title, body, href) values ($1,$2,$3,$4)`, [args.kind, args.title, args.body ?? null, args.href ?? null]).catch((e) => console.error("[notify] insert failed", e.message));
}
async function adminRecipients() {
    const s = await getSettings();
    const explicit = String(s.notifications?.admin_emails ?? "")
        .split(/[,;\s]+/)
        .map((v) => v.trim())
        .filter((v) => v.includes("@"));
    if (explicit.length)
        return explicit;
    const fallback = String(s.store_profile?.email ?? "").trim();
    if (fallback.includes("@"))
        return [fallback];
    const rows = await query(`select email from admin_users where status = 'active' and role in ('super_admin','admin') order by created_at limit 5`);
    return rows.map((r) => r.email);
}
/** Fired the moment an order is created. Never throws — an email problem
 *  must not lose the customer's order. */
export async function notifyOrderPlaced(order) {
    try {
        const s = await getSettings();
        const n = s.notifications ?? {};
        const baseCurrency = String(s.currency?.base ?? "GBP");
        const storeName = String(s.branding?.store_name ?? "Store");
        const money = (m) => formatMoney(m, baseCurrency);
        const adminUrl = `${env.SITE_URL}/admin/orders/${order.id}`;
        await pushNotification({
            kind: "order.placed",
            title: `New order ${order.number}`,
            body: `${money(order.total_minor)} \u00b7 ${order.email}`,
            href: `/admin/orders/${order.id}`,
        });
        const rows = order.items
            .map((i) => `<tr><td style="padding:6px 0">${escapeHtml(i.title)}${i.variant_title ? ` <span style="color:#78716c">(${escapeHtml(i.variant_title)})</span>` : ""}</td><td align="center" style="padding:6px 0">\u00d7${i.qty}</td><td align="right" style="padding:6px 0">${money(i.total_minor)}</td></tr>`)
            .join("");
        const table = `<table role="presentation" width="100%" style="font-size:14px;border-collapse:collapse">
      ${rows}
      <tr><td colspan="3" style="border-top:1px solid #e7e5e4;padding-top:10px"></td></tr>
      <tr><td colspan="2" style="font-weight:700">Total</td><td align="right" style="font-weight:700">${money(order.total_minor)}</td></tr></table>`;
        if (n.on_order_placed !== false) {
            const to = await adminRecipients();
            if (to.length) {
                await sendMail({
                    to,
                    template: "admin.order.placed",
                    subject: `\ud83d\udd14 New order ${order.number} \u2014 ${money(order.total_minor)}`,
                    html: await emailShell(`<h2 style="margin:0 0 6px;font-size:19px">New order ${escapeHtml(order.number)}</h2>
             <p style="margin:0 0 16px;color:#57534e">${escapeHtml(order.email)} \u00b7 paid by ${escapeHtml(order.payment_method ?? "unknown")}</p>
             ${table}
             ${button("Open in admin", adminUrl)}`, `New order ${order.number} for ${money(order.total_minor)}`),
                });
            }
        }
        // Customer confirmation
        await sendMail({
            to: order.email,
            template: "customer.order.confirmation",
            subject: `Your ${storeName} order ${order.number}`,
            html: await emailShell(`<h2 style="margin:0 0 6px;font-size:19px">Thanks for your order</h2>
         <p style="margin:0 0 16px;color:#57534e">Order <strong>${escapeHtml(order.number)}</strong> is confirmed. We\u2019ll email you again when it ships.</p>
         ${table}
         ${button("Track your order", `${env.SITE_URL}/track-order?number=${encodeURIComponent(order.number)}`)}`, `Order ${order.number} confirmed`),
        });
    }
    catch (err) {
        console.error("[notify] order.placed failed:", err.message);
    }
}
export async function notifyOrderStatus(order, status) {
    try {
        const s = await getSettings();
        const storeName = String(s.branding?.store_name ?? "Store");
        const pretty = {
            confirmed: "is confirmed",
            processing: "is being prepared",
            shipped: "has shipped",
            out_for_delivery: "is out for delivery",
            delivered: "has been delivered",
            cancelled: "has been cancelled",
            returned: "has been returned",
        };
        const phrase = pretty[status];
        if (!phrase)
            return;
        const tracking = status === "shipped" && order.tracking_number
            ? `<p style="margin:0 0 8px">Tracking number: <strong>${escapeHtml(order.tracking_number)}</strong></p>` +
                (order.tracking_url ? button("Track parcel", order.tracking_url) : "")
            : "";
        await sendMail({
            to: order.email,
            template: `customer.order.${status}`,
            subject: `Your ${storeName} order ${order.number} ${phrase}`,
            html: await emailShell(`<h2 style="margin:0 0 6px;font-size:19px">Order ${escapeHtml(order.number)} ${escapeHtml(phrase)}</h2>
         ${tracking}
         ${button("View order", `${env.SITE_URL}/track-order?number=${encodeURIComponent(order.number)}`)}`),
        });
    }
    catch (err) {
        console.error("[notify] status email failed:", err.message);
    }
}
export async function notifyLowStock(product) {
    try {
        const n = await getNamespace("notifications");
        if (n.on_low_stock === false)
            return;
        await pushNotification({
            kind: "stock.low",
            title: `Low stock: ${product.title}`,
            body: `${product.stock} left`,
            href: `/admin/products/${product.id}`,
        });
        const to = await adminRecipients();
        if (!to.length)
            return;
        await sendMail({
            to,
            template: "admin.stock.low",
            subject: `Low stock \u2014 ${product.title} (${product.stock} left)`,
            html: await emailShell(`<p style="margin:0 0 12px"><strong>${escapeHtml(product.title)}</strong> is down to ${product.stock} in stock.</p>${button("Restock", `${env.SITE_URL}/admin/products/${product.id}`)}`),
        });
    }
    catch (err) {
        console.error("[notify] low stock failed:", err.message);
    }
}
export async function notifyContactMessage(msg) {
    try {
        const n = await getNamespace("notifications");
        await pushNotification({
            kind: "contact.new",
            title: `Message from ${msg.name}`,
            body: (msg.subject ?? msg.body).slice(0, 120),
            href: "/admin/messages",
        });
        if (n.on_contact_message === false)
            return;
        const to = await adminRecipients();
        if (!to.length)
            return;
        await sendMail({
            to,
            replyTo: msg.email,
            template: "admin.contact.new",
            subject: `Contact form: ${msg.subject || "New message"}`,
            html: await emailShell(`<p style="margin:0 0 4px"><strong>${escapeHtml(msg.name)}</strong> &lt;${escapeHtml(msg.email)}&gt;</p>
         <p style="margin:0 0 12px;color:#57534e">${escapeHtml(msg.subject ?? "")}</p>
         <div style="white-space:pre-wrap;background:#fafaf9;border-radius:8px;padding:14px">${escapeHtml(msg.body)}</div>`),
        });
    }
    catch (err) {
        console.error("[notify] contact failed:", err.message);
    }
}
//# sourceMappingURL=notifications.js.map