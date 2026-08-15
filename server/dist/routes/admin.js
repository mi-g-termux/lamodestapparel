import { Router } from "express";
import { query, one } from "../db.js";
import { userFromRequest, createSession, destroySession, verifyPassword, hashPassword, passwordProblems, lockoutMinutesFor, clientIp, can, isDeveloperZone, csrfGuard, rateLimit, ALL_PERMISSIONS, permissionsFor, } from "../security.js";
import { getSettingsForClient, saveSettings, auditWrite, DEFAULT_SETTINGS, invalidateSettings, } from "../settings.js";
import { verifySmtp, sendMail, emailShell, resetTransport } from "../mailer.js";
import { refreshRates, getAllRates, CURRENCY_META, formatMoney } from "../fx.js";
import { updateOrderField, revenueSeries, dashboardSummary, topProducts, previewOrderNumber, ORDER_STATUSES, PAYMENT_STATUSES, FULFILLMENT_STATUSES, } from "../orders.js";
import { renderInvoicePdf, renderInvoiceHtml, ensureInvoice } from "../invoice.js";
export const adminRouter = Router();
async function requireAuth(req, res, next) {
    const user = await userFromRequest(req);
    if (!user) {
        res.status(401).json({ error: "Please sign in again." });
        return;
    }
    req.admin = user;
    next();
}
function requirePerm(permission) {
    return (req, res, next) => {
        if (!can(req.admin ?? null, permission)) {
            res.status(403).json({ error: `You do not have permission to do that (${permission}).` });
            return;
        }
        next();
    };
}
function requireDeveloper(req, res, next) {
    if (!isDeveloperZone(req.admin ?? null)) {
        res.status(403).json({ error: "This area is restricted to super admins and developers." });
        return;
    }
    next();
}
const audit = async (req, action, entity, before, after) => auditWrite(req.admin?.id ?? null, req.admin?.name ?? null, action, entity, clientIp(req), before, after);
/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */
adminRouter.post("/auth/login", rateLimit("admin_login", 10, 900), async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const generic = "Email or password is incorrect.";
    const user = await one(`select * from admin_users where lower(email) = $1`, [email]);
    await query(`insert into login_attempts (email, ip, ok) values ($1,$2,false)`, [email, clientIp(req)]).catch(() => { });
    if (user?.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
        const mins = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
        res.status(423).json({ error: `Too many failed attempts. Try again in ${mins} minute(s).` });
        return;
    }
    if (!user || user.status !== "active" || !verifyPassword(password, user.password_hash)) {
        if (user) {
            const failures = user.failed_attempts + 1;
            const mins = lockoutMinutesFor(failures);
            await query(`update admin_users set failed_attempts = $1,
                locked_until = case when $2::int > 0 then now() + ($2 || ' minutes')::interval else null end
          where id = $3`, [failures, mins, user.id]);
            if (failures >= 10) {
                await audit(req, "auth.lockout", email);
            }
        }
        res.status(401).json({ error: generic });
        return;
    }
    await query(`update admin_users set failed_attempts = 0, locked_until = null, last_login_at = now() where id = $1`, [user.id]);
    await query(`update login_attempts set ok = true where email = $1 and created_at > now() - interval '10 seconds'`, [email]).catch(() => { });
    await createSession(user.id, req, res);
    await auditWrite(user.id, email, "auth.login", email, clientIp(req));
    const full = await userFromRequest(req);
    res.json({ user: full, mustChangePassword: user.must_change_password });
});
adminRouter.post("/auth/logout", async (req, res) => {
    await destroySession(req, res);
    res.json({ ok: true });
});
adminRouter.get("/auth/me", async (req, res) => {
    const user = await userFromRequest(req);
    if (!user) {
        res.status(401).json({ error: "Not signed in" });
        return;
    }
    const overrides = Array.isArray(user.overrides) ? user.overrides : [];
    res.json({ user, permissions: [...permissionsFor(user.role, overrides)] });
});
// Everything below needs a session + CSRF token on writes.
adminRouter.use(requireAuth, csrfGuard);
adminRouter.post("/auth/change-password", async (req, res) => {
    const b = req.body;
    const current = String(b.currentPassword ?? "");
    const next = String(b.newPassword ?? "");
    const row = await one(`select password_hash from admin_users where id = $1`, [req.admin.id]);
    if (!row || !verifyPassword(current, row.password_hash)) {
        res.status(400).json({ error: "Your current password is incorrect." });
        return;
    }
    const problems = passwordProblems(next);
    if (problems.length) {
        res.status(400).json({ error: `Password ${problems.join(", ")}.` });
        return;
    }
    await query(`update admin_users set password_hash = $1, must_change_password = false where id = $2`, [hashPassword(next), req.admin.id]);
    await query(`update admin_sessions set revoked_at = now() where user_id = $1`, [req.admin.id]);
    await audit(req, "auth.password_changed", req.admin.email);
    res.json({ ok: true });
});
/* ------------------------------------------------------------------ *
 * Dashboard — real numbers only; a brand new store reads all zeroes.
 * ------------------------------------------------------------------ */
adminRouter.get("/dashboard", requirePerm("dashboard.view"), async (req, res) => {
    const granularity = String(req.query.granularity ?? "day");
    const days = Math.min(730, Math.max(7, Number(req.query.days ?? 30)));
    const showRevenue = can(req.admin, "report.revenue.view");
    const [summary, series, top, recent] = await Promise.all([
        dashboardSummary(),
        showRevenue ? revenueSeries(granularity, days) : Promise.resolve([]),
        showRevenue ? topProducts(8) : Promise.resolve([]),
        query(`select id, number, email, status, payment_status, total_minor, currency, placed_at
         from orders order by placed_at desc limit 8`),
    ]);
    const settings = await getSettingsForClient();
    const base = String(settings.currency?.base ?? "GBP");
    res.json({
        currency: { base, symbol: CURRENCY_META[base]?.symbol ?? base, decimals: CURRENCY_META[base]?.decimals ?? 2 },
        summary,
        revenueSeries: series,
        topProducts: top,
        recentOrders: recent,
        format: { sample: formatMoney(summary.revenue_this_month ?? 0, base) },
    });
});
adminRouter.get("/reports/revenue", requirePerm("report.revenue.view"), async (req, res) => {
    const granularity = String(req.query.granularity ?? "month");
    const days = Math.min(1095, Math.max(7, Number(req.query.days ?? 365)));
    res.json({ series: await revenueSeries(granularity, days), top: await topProducts(20) });
});
/* ------------------------------------------------------------------ *
 * Notification bell
 * ------------------------------------------------------------------ */
adminRouter.get("/notifications", async (req, res) => {
    const rows = await query(`select * from notifications order by created_at desc limit 50`);
    const unread = await one(`select count(*)::int as n from notifications where read_at is null`);
    res.json({ notifications: rows, unread: unread?.n ?? 0 });
});
adminRouter.post("/notifications/read", async (req, res) => {
    const id = req.body?.id;
    if (id)
        await query(`update notifications set read_at = now() where id = $1`, [String(id)]);
    else
        await query(`update notifications set read_at = now() where read_at is null`);
    res.json({ ok: true });
});
/* ------------------------------------------------------------------ *
 * Products
 * ------------------------------------------------------------------ */
adminRouter.get("/products", requirePerm("product.read"), async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
    const offset = Math.max(0, Number(req.query.offset ?? 0));
    const q = String(req.query.q ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const rows = await query(`select p.*, (select m.url from product_images pi join media m on m.id = pi.media_id
                   where pi.product_id = p.id order by pi.position limit 1) as image_url
       from products p
      where ($1 = '' or p.title ilike '%' || $1 || '%' or p.sku ilike '%' || $1 || '%')
        and ($2 = '' or p.status = $2)
      order by p.updated_at desc limit $3 offset $4`, [q, status, limit, offset]);
    const total = await one(`select count(*)::int as n from products where ($1 = '' or title ilike '%' || $1 || '%') and ($2 = '' or status = $2)`, [q, status]);
    res.json({ products: rows, total: total?.n ?? 0 });
});
adminRouter.get("/products/:id", requirePerm("product.read"), async (req, res) => {
    const product = await one(`select * from products where id = $1`, [req.params.id]);
    if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
    }
    const [variants, images, categories] = await Promise.all([
        query(`select * from product_variants where product_id = $1 order by position`, [req.params.id]),
        query(`select pi.id, pi.media_id, pi.position, m.url, m.alt from product_images pi join media m on m.id = pi.media_id where pi.product_id = $1 order by pi.position`, [req.params.id]),
        query(`select category_id from product_categories where product_id = $1`, [req.params.id]),
    ]);
    res.json({ product, variants, images, categoryIds: categories.map((c) => c.category_id) });
});
const PRODUCT_FIELDS = [
    "slug", "title", "subtitle", "description", "status", "price_minor", "compare_at_minor",
    "cost_minor", "currency", "sku", "barcode", "track_stock", "stock", "low_stock_at",
    "weight_grams", "tax_class", "featured", "rating_override", "review_count_override",
    "seo_title", "seo_description",
];
function pickProduct(body) {
    const cols = [];
    const vals = [];
    for (const f of PRODUCT_FIELDS) {
        if (body[f] !== undefined) {
            cols.push(f);
            vals.push(body[f]);
        }
    }
    return { cols, vals };
}
adminRouter.post("/products", requirePerm("product.create"), async (req, res) => {
    const body = req.body;
    const title = String(body.title ?? "").trim();
    if (!title) {
        res.status(400).json({ error: "A product needs a title." });
        return;
    }
    const slug = String(body.slug ?? "").trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const clash = await one(`select id from products where slug = $1`, [slug]);
    const finalSlug = clash ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug;
    const row = await one(`insert into products (slug, title, status, price_minor) values ($1,$2,$3,$4) returning id`, [finalSlug, title, String(body.status ?? "draft"), Number(body.price_minor ?? 0)]);
    await audit(req, "product.create", title, null, { id: row?.id, slug: finalSlug });
    res.status(201).json({ id: row?.id, slug: finalSlug });
});
adminRouter.patch("/products/:id", requirePerm("product.update"), async (req, res) => {
    const before = await one(`select * from products where id = $1`, [req.params.id]);
    if (!before) {
        res.status(404).json({ error: "Product not found" });
        return;
    }
    const { cols, vals } = pickProduct(req.body);
    if (cols.length) {
        const sets = cols.map((c, i) => `"${c}" = $${i + 1}`).join(", ");
        await query(`update products set ${sets}, updated_at = now() where id = $${cols.length + 1}`, [...vals, req.params.id]);
    }
    const body = req.body;
    if (Array.isArray(body.categoryIds)) {
        await query(`delete from product_categories where product_id = $1`, [req.params.id]);
        for (const cid of body.categoryIds) {
            await query(`insert into product_categories (product_id, category_id) values ($1,$2) on conflict do nothing`, [req.params.id, cid]);
        }
    }
    if (Array.isArray(body.imageMediaIds)) {
        await query(`delete from product_images where product_id = $1`, [req.params.id]);
        let pos = 0;
        for (const mid of body.imageMediaIds) {
            await query(`insert into product_images (product_id, media_id, position) values ($1,$2,$3)`, [req.params.id, mid, pos++]);
        }
    }
    if (Array.isArray(body.variants)) {
        await query(`delete from product_variants where product_id = $1`, [req.params.id]);
        let pos = 0;
        for (const v of body.variants) {
            await query(`insert into product_variants (product_id, title, options, sku, price_minor, stock, position)
         values ($1,$2,$3::jsonb,$4,$5,$6,$7)`, [req.params.id, String(v.title ?? "Default"), JSON.stringify(v.options ?? {}), v.sku ?? null,
                v.price_minor === null || v.price_minor === undefined ? null : Number(v.price_minor),
                Number(v.stock ?? 0), pos++]);
        }
    }
    await audit(req, "product.update", String(before.title), before, req.body);
    res.json({ ok: true });
});
adminRouter.delete("/products/:id", requirePerm("product.delete"), async (req, res) => {
    const before = await one(`select title from products where id = $1`, [req.params.id]);
    await query(`delete from products where id = $1`, [req.params.id]);
    await audit(req, "product.delete", String(before?.title ?? req.params.id), before);
    res.json({ ok: true });
});
/* ------------------------------------------------------------------ *
 * Orders (+ the invoice download button)
 * ------------------------------------------------------------------ */
adminRouter.get("/orders", requirePerm("order.read"), async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
    const offset = Math.max(0, Number(req.query.offset ?? 0));
    const q = String(req.query.q ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const payment = String(req.query.payment_status ?? "").trim();
    const rows = await query(`select o.*, (select count(*)::int from order_items oi where oi.order_id = o.id) as item_count,
            (select i.number from invoices i where i.order_id = o.id) as invoice_number
       from orders o
      where ($1 = '' or o.number ilike '%' || $1 || '%' or o.email ilike '%' || $1 || '%')
        and ($2 = '' or o.status = $2)
        and ($3 = '' or o.payment_status = $3)
      order by o.placed_at desc limit $4 offset $5`, [q, status, payment, limit, offset]);
    const total = await one(`select count(*)::int as n from orders
      where ($1 = '' or number ilike '%' || $1 || '%' or email ilike '%' || $1 || '%')
        and ($2 = '' or status = $2) and ($3 = '' or payment_status = $3)`, [q, status, payment]);
    res.json({
        orders: rows,
        total: total?.n ?? 0,
        statuses: { status: ORDER_STATUSES, payment: PAYMENT_STATUSES, fulfillment: FULFILLMENT_STATUSES },
    });
});
adminRouter.get("/orders/:id", requirePerm("order.read"), async (req, res) => {
    const order = await one(`select * from orders where id = $1`, [req.params.id]);
    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    const [items, history, invoice, payments, refunds] = await Promise.all([
        query(`select * from order_items where order_id = $1`, [req.params.id]),
        query(`select * from order_status_history where order_id = $1 order by created_at desc`, [req.params.id]),
        one(`select * from invoices where order_id = $1`, [req.params.id]),
        query(`select * from payments where order_id = $1 order by created_at desc`, [req.params.id]),
        query(`select * from refunds where order_id = $1 order by created_at desc`, [req.params.id]),
    ]);
    res.json({ order, items, history, invoice, payments, refunds });
});
adminRouter.patch("/orders/:id", requirePerm("order.update"), async (req, res) => {
    const b = req.body;
    const actor = req.admin.name;
    for (const field of ["status", "payment_status", "fulfillment_status"]) {
        if (b[field] !== undefined) {
            if (field === "status" && !can(req.admin, "order.status.update")) {
                res.status(403).json({ error: "You cannot change order status." });
                return;
            }
            const result = await updateOrderField(req.params.id, field, String(b[field]), actor, b.note ? String(b.note) : undefined);
            if (!result.ok) {
                res.status(400).json({ error: result.error });
                return;
            }
        }
    }
    const simple = ["tracking_number", "tracking_url", "courier", "staff_note", "shipping_method"];
    for (const f of simple) {
        if (b[f] !== undefined) {
            await query(`update orders set "${f}" = $1, updated_at = now() where id = $2`, [b[f], req.params.id]);
        }
    }
    await audit(req, "order.update", req.params.id, null, b);
    res.json({ ok: true });
});
adminRouter.post("/orders/:id/refund", requirePerm("order.refund"), async (req, res) => {
    const amount = Math.max(0, Number(req.body?.amountMinor ?? 0));
    const reason = String(req.body?.reason ?? "");
    const order = await one(`select total_minor from orders where id = $1`, [req.params.id]);
    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    await query(`insert into refunds (order_id, amount_minor, reason, actor) values ($1,$2,$3,$4)`, [req.params.id, amount, reason, req.admin.name]);
    const refunded = await one(`select coalesce(sum(amount_minor),0)::bigint as total from refunds where order_id = $1`, [req.params.id]);
    const status = (refunded?.total ?? 0) >= order.total_minor ? "refunded" : "partially_refunded";
    await updateOrderField(req.params.id, "payment_status", status, req.admin.name, reason);
    await audit(req, "order.refund", req.params.id, null, { amount, reason });
    res.json({ ok: true, paymentStatus: status });
});
/** ⬇︎ The invoice download button in the Orders tab points here. */
adminRouter.get("/orders/:id/invoice.pdf", requirePerm("invoice.download"), async (req, res) => {
    const pdf = await renderInvoicePdf(String(req.params.id));
    if (!pdf) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    const order = await one(`select number from orders where id = $1`, [req.params.id]);
    await audit(req, "invoice.download", order?.number ?? String(req.params.id));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${order?.number ?? "order"}.pdf"`);
    res.send(pdf);
});
adminRouter.get("/orders/:id/invoice.html", requirePerm("invoice.download"), async (req, res) => {
    const html = await renderInvoiceHtml(String(req.params.id));
    if (!html) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
});
adminRouter.post("/orders/:id/invoice", requirePerm("invoice.download"), async (req, res) => {
    res.json({ invoice: await ensureInvoice(String(req.params.id)) });
});
/* ------------------------------------------------------------------ *
 * Customers
 * ------------------------------------------------------------------ */
adminRouter.get("/customers", requirePerm("customer.read"), async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const rows = await query(`select c.*, 
            (select count(*)::int from orders o where lower(o.email) = lower(c.email)) as order_count,
            (select coalesce(sum(o.total_minor),0)::bigint from orders o
              where lower(o.email) = lower(c.email) and o.payment_status = 'paid') as spent_minor
       from customers c
      where ($1 = '' or c.email ilike '%' || $1 || '%' or c.name ilike '%' || $1 || '%')
      order by c.created_at desc limit 200`, [q]);
    res.json({ customers: rows });
});
adminRouter.get("/customers/:id", requirePerm("customer.read"), async (req, res) => {
    const customer = await one(`select * from customers where id = $1`, [req.params.id]);
    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }
    const orders = await query(`select * from orders where lower(email) = lower($1) order by placed_at desc`, [String(customer.email)]);
    const addresses = await query(`select * from addresses where customer_id = $1`, [req.params.id]);
    res.json({ customer, orders, addresses });
});
/* ------------------------------------------------------------------ *
 * Content: banners / sliders, pages, navigation, testimonials
 * ------------------------------------------------------------------ */
adminRouter.get("/banners", requirePerm("content.manage"), async (_req, res) => {
    res.json({
        banners: await query(`select b.*, m.url as media_url from banners b left join media m on m.id = b.media_id
        order by b.placement, b.position`),
    });
});
const BANNER_FIELDS = ["placement", "title", "subtitle", "body", "cta_label", "cta_href", "media_id", "image_url", "bg_color", "text_color", "position", "active", "starts_at", "ends_at"];
adminRouter.post("/banners", requirePerm("content.manage"), async (req, res) => {
    const b = req.body;
    const row = await one(`insert into banners (placement, title, subtitle, cta_label, cta_href, image_url, media_id, position, active)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`, [String(b.placement ?? "hero"), b.title ?? "", b.subtitle ?? "", b.cta_label ?? "", b.cta_href ?? "",
        b.image_url ?? null, b.media_id ?? null, Number(b.position ?? 0), b.active !== false]);
    await audit(req, "banner.create", String(b.title ?? ""), null, b);
    res.status(201).json({ id: row?.id });
});
adminRouter.patch("/banners/:id", requirePerm("content.manage"), async (req, res) => {
    const b = req.body;
    const cols = BANNER_FIELDS.filter((f) => b[f] !== undefined);
    if (cols.length) {
        const sets = cols.map((c, i) => `"${c}" = $${i + 1}`).join(", ");
        await query(`update banners set ${sets} where id = $${cols.length + 1}`, [...cols.map((c) => b[c]), req.params.id]);
    }
    await audit(req, "banner.update", String(req.params.id), null, b);
    res.json({ ok: true });
});
adminRouter.delete("/banners/:id", requirePerm("content.manage"), async (req, res) => {
    await query(`delete from banners where id = $1`, [req.params.id]);
    await audit(req, "banner.delete", String(req.params.id));
    res.json({ ok: true });
});
adminRouter.get("/pages", requirePerm("content.manage"), async (_req, res) => {
    res.json({ pages: await query(`select * from pages order by title`) });
});
adminRouter.post("/pages", requirePerm("content.manage"), async (req, res) => {
    const b = req.body;
    const row = await one(`insert into pages (slug, title, body, published) values ($1,$2,$3,$4)
     on conflict (slug) do update set title = excluded.title, body = excluded.body,
       published = excluded.published, updated_at = now() returning id`, [String(b.slug ?? "").trim(), String(b.title ?? ""), String(b.body ?? ""), b.published !== false]);
    await audit(req, "page.save", String(b.slug ?? ""), null, b);
    res.json({ id: row?.id });
});
adminRouter.get("/navigation", requirePerm("content.manage"), async (_req, res) => {
    res.json({ items: await query(`select * from navigation_items order by menu, position`) });
});
adminRouter.put("/navigation", requirePerm("content.manage"), async (req, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
        res.status(400).json({ error: "Expected a list of menu items." });
        return;
    }
    await query(`delete from navigation_items`);
    let pos = 0;
    for (const it of items) {
        await query(`insert into navigation_items (menu, label, href, position, visible) values ($1,$2,$3,$4,$5)`, [String(it.menu ?? "header"), String(it.label ?? ""), String(it.href ?? "/"), Number(it.position ?? pos++), it.visible !== false]);
    }
    await audit(req, "navigation.update", "menus", null, { count: items.length });
    res.json({ ok: true });
});
/* ------------------------------------------------------------------ *
 * Settings — branding/logo, currency, order prefix, SMTP, features
 * ------------------------------------------------------------------ */
adminRouter.get("/settings", requirePerm("settings.read"), async (req, res) => {
    const tree = await getSettingsForClient();
    if (!can(req.admin, "settings.payments.read"))
        delete tree.payments;
    if (!can(req.admin, "settings.smtp.read"))
        delete tree.smtp;
    if (!isDeveloperZone(req.admin))
        delete tree.security;
    res.json({ settings: tree, namespaces: Object.keys(DEFAULT_SETTINGS) });
});
adminRouter.put("/settings/:namespace", async (req, res) => {
    const ns = String(req.params.namespace);
    if (!DEFAULT_SETTINGS[ns]) {
        res.status(400).json({ error: "Unknown settings section." });
        return;
    }
    const needed = ns === "payments" ? "settings.payments.write" :
        ns === "smtp" ? "settings.smtp.write" :
            ns === "features" ? "features.manage" : "settings.write";
    if (!can(req.admin, needed)) {
        res.status(403).json({ error: "You do not have permission to change these settings." });
        return;
    }
    if (ns === "security" && !isDeveloperZone(req.admin)) {
        res.status(403).json({ error: "Security settings are restricted." });
        return;
    }
    const before = (await getSettingsForClient())[ns];
    const patch = req.body;
    // Only accept keys we actually know about — no arbitrary writes.
    const allowed = Object.keys(DEFAULT_SETTINGS[ns]);
    const clean = {};
    for (const [k, v] of Object.entries(patch))
        if (allowed.includes(k))
            clean[k] = v;
    await saveSettings(ns, clean);
    if (ns === "smtp")
        resetTransport();
    if (ns === "currency")
        void refreshRates();
    await audit(req, `settings.${ns}.update`, ns, before, clean);
    res.json({ ok: true, settings: (await getSettingsForClient())[ns] });
});
/** Live preview for the order-number prefix field. */
adminRouter.post("/settings/orders/preview", requirePerm("settings.read"), (req, res) => {
    res.json({ preview: previewOrderNumber(req.body) });
});
/** One-switch feature toggles. */
adminRouter.get("/features", requirePerm("settings.read"), async (_req, res) => {
    const tree = await getSettingsForClient();
    res.json({ features: tree.features, defaults: DEFAULT_SETTINGS.features });
});
adminRouter.post("/features/toggle", requirePerm("features.manage"), async (req, res) => {
    const b = req.body;
    const key = String(b.key ?? "");
    if (!(key in (DEFAULT_SETTINGS.features ?? {}))) {
        res.status(400).json({ error: "Unknown feature." });
        return;
    }
    await saveSettings("features", { [key]: b.value === true });
    await audit(req, "feature.toggle", key, null, { value: b.value === true });
    res.json({ ok: true });
});
/* ------------------------------------------------------------------ *
 * SMTP test + currency tools
 * ------------------------------------------------------------------ */
adminRouter.post("/smtp/test", requirePerm("settings.smtp.write"), rateLimit("smtp_test", 5, 600), async (req, res) => {
    const to = String(req.body?.to ?? req.admin.email);
    const verified = await verifySmtp();
    if (!verified.ok) {
        res.status(400).json({ ok: false, error: `Could not connect: ${verified.error}` });
        return;
    }
    const sent = await sendMail({
        to,
        subject: "SMTP test \u2014 it works",
        template: "smtp.test",
        html: await emailShell(`<h2 style="margin:0 0 8px;font-size:18px">Your email settings work</h2>
       <p style="margin:0;color:#57534e">Sent from your admin panel at ${new Date().toLocaleString("en-GB")}.</p>`),
    });
    await audit(req, "smtp.test", to, null, sent);
    res.status(sent.ok ? 200 : 400).json(sent);
});
adminRouter.post("/currency/refresh", requirePerm("settings.write"), rateLimit("fx_refresh", 10, 600), async (req, res) => {
    const result = await refreshRates();
    await audit(req, "currency.refresh", "exchange_rates", null, result);
    res.json(result);
});
adminRouter.get("/currency/rates", requirePerm("settings.read"), async (_req, res) => {
    const tree = await getSettingsForClient();
    const base = String(tree.currency?.base ?? "GBP");
    const rates = await getAllRates(base);
    const rows = await query(`select base, quote, rate, source, fetched_at from exchange_rates order by quote`);
    res.json({
        base,
        rates,
        rows,
        supported: Object.entries(CURRENCY_META).map(([code, m]) => ({ code, ...m })),
    });
});
adminRouter.put("/currency/rate", requirePerm("settings.write"), async (req, res) => {
    const b = req.body;
    await query(`insert into exchange_rates (base, quote, rate, source, fetched_at) values ($1,$2,$3,'manual',now())
     on conflict (base, quote) do update set rate = excluded.rate, source = 'manual', fetched_at = now()`, [String(b.base), String(b.quote), Number(b.rate)]);
    await audit(req, "currency.rate.manual", `${b.base}/${b.quote}`, null, b);
    res.json({ ok: true });
});
/* ------------------------------------------------------------------ *
 * Media — the logo picker uses this
 * ------------------------------------------------------------------ */
adminRouter.get("/media", requirePerm("media.manage"), async (req, res) => {
    const folder = String(req.query.folder ?? "");
    res.json({
        media: await query(`select * from media where ($1 = '' or folder = $1) order by created_at desc limit 300`, [folder]),
    });
});
adminRouter.post("/media/link", requirePerm("media.manage"), async (req, res) => {
    const b = req.body;
    const url = String(b.url ?? "").trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
        res.status(400).json({ error: "Enter a full https:// image URL." });
        return;
    }
    const row = await one(`insert into media (url, alt, folder) values ($1,$2,$3) returning id, url`, [url, String(b.alt ?? ""), String(b.folder ?? "misc")]);
    await audit(req, "media.link", url);
    res.status(201).json(row);
});
adminRouter.delete("/media/:id", requirePerm("media.manage"), async (req, res) => {
    await query(`delete from media where id = $1`, [req.params.id]);
    res.json({ ok: true });
});
/* ------------------------------------------------------------------ *
 * Discounts, subscribers, messages, reviews
 * ------------------------------------------------------------------ */
adminRouter.get("/coupons", requirePerm("discount.manage"), async (_req, res) => {
    res.json({ coupons: await query(`select * from coupons order by created_at desc`) });
});
adminRouter.post("/coupons", requirePerm("discount.manage"), async (req, res) => {
    const b = req.body;
    const code = String(b.code ?? "").trim().toUpperCase();
    if (!code) {
        res.status(400).json({ error: "A discount needs a code." });
        return;
    }
    const row = await one(`insert into coupons (code, type, value, min_spend_minor, usage_limit, starts_at, ends_at, active)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (code) do update set type = excluded.type, value = excluded.value,
       min_spend_minor = excluded.min_spend_minor, usage_limit = excluded.usage_limit,
       starts_at = excluded.starts_at, ends_at = excluded.ends_at, active = excluded.active
     returning id`, [code, String(b.type ?? "percent"), Number(b.value ?? 0), Number(b.min_spend_minor ?? 0),
        b.usage_limit ? Number(b.usage_limit) : null, b.starts_at ?? null, b.ends_at ?? null, b.active !== false]);
    await audit(req, "coupon.save", code, null, b);
    res.json({ id: row?.id });
});
adminRouter.delete("/coupons/:id", requirePerm("discount.manage"), async (req, res) => {
    await query(`delete from coupons where id = $1`, [req.params.id]);
    res.json({ ok: true });
});
adminRouter.get("/subscribers", requirePerm("customer.read"), async (_req, res) => {
    res.json({ subscribers: await query(`select * from newsletter_subscribers order by created_at desc limit 500`) });
});
adminRouter.get("/messages", requirePerm("customer.read"), async (_req, res) => {
    res.json({ messages: await query(`select * from contact_messages order by created_at desc limit 300`) });
});
adminRouter.get("/reviews", requirePerm("content.manage"), async (_req, res) => {
    res.json({
        reviews: await query(`select r.*, p.title as product_title from product_reviews r
         join products p on p.id = r.product_id order by r.created_at desc limit 300`),
    });
});
adminRouter.patch("/reviews/:id", requirePerm("content.manage"), async (req, res) => {
    const state = String(req.body?.state ?? "");
    if (!["pending", "published", "rejected"].includes(state)) {
        res.status(400).json({ error: "Unknown review state." });
        return;
    }
    await query(`update product_reviews set state = $1 where id = $2`, [state, req.params.id]);
    await audit(req, "review.moderate", String(req.params.id), null, { state });
    res.json({ ok: true });
});
/* ------------------------------------------------------------------ *
 * Staff & audit (restricted)
 * ------------------------------------------------------------------ */
adminRouter.get("/staff", requirePerm("user.manage"), async (_req, res) => {
    res.json({
        staff: await query(`select id, email, name, role, status, overrides, last_login_at, failed_attempts, locked_until, created_at
         from admin_users order by created_at`),
        roles: ["super_admin", "developer", "admin", "manager", "staff", "fulfilment", "support", "auditor"],
        permissions: ALL_PERMISSIONS,
    });
});
adminRouter.post("/staff", requirePerm("user.manage"), async (req, res) => {
    const b = req.body;
    const email = String(b.email ?? "").trim().toLowerCase();
    const password = String(b.password ?? "");
    const problems = passwordProblems(password);
    if (!email.includes("@") || problems.length) {
        res.status(400).json({ error: problems.length ? `Password ${problems.join(", ")}.` : "A valid email is required." });
        return;
    }
    if ((String(b.role) === "super_admin" || String(b.role) === "developer") && !isDeveloperZone(req.admin)) {
        res.status(403).json({ error: "Only a super admin can create super admins or developers." });
        return;
    }
    const row = await one(`insert into admin_users (email, name, password_hash, role, must_change_password)
     values ($1,$2,$3,$4,true) returning id`, [email, String(b.name ?? email), hashPassword(password), String(b.role ?? "staff")]);
    await audit(req, "staff.create", email, null, { role: b.role });
    res.status(201).json({ id: row?.id });
});
adminRouter.patch("/staff/:id", requirePerm("user.manage"), async (req, res) => {
    const b = req.body;
    if (req.params.id === req.admin.id && b.status === "suspended") {
        res.status(400).json({ error: "You cannot suspend your own account." });
        return;
    }
    for (const f of ["name", "role", "status"]) {
        if (b[f] !== undefined)
            await query(`update admin_users set "${f}" = $1 where id = $2`, [b[f], req.params.id]);
    }
    if (Array.isArray(b.overrides)) {
        await query(`update admin_users set overrides = $1::jsonb where id = $2`, [JSON.stringify(b.overrides), req.params.id]);
    }
    if (b.password) {
        const problems = passwordProblems(String(b.password));
        if (problems.length) {
            res.status(400).json({ error: `Password ${problems.join(", ")}.` });
            return;
        }
        await query(`update admin_users set password_hash = $1, must_change_password = true where id = $2`, [hashPassword(String(b.password)), req.params.id]);
    }
    if (b.unlock === true) {
        await query(`update admin_users set failed_attempts = 0, locked_until = null where id = $1`, [req.params.id]);
    }
    await audit(req, "staff.update", String(req.params.id), null, { ...b, password: undefined });
    res.json({ ok: true });
});
adminRouter.get("/audit", requirePerm("audit.view"), async (req, res) => {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 200)));
    res.json({ entries: await query(`select * from audit_log order by created_at desc limit $1`, [limit]) });
});
/* ------------------------------------------------------------------ *
 * Developer / system zone
 * ------------------------------------------------------------------ */
adminRouter.get("/system", requireDeveloper, async (_req, res) => {
    const [tables, sizes, emailLog, sessions] = await Promise.all([
        query(`select count(*)::int as n from information_schema.tables where table_schema = 'public'`),
        query(`select 'products' as t, count(*)::int as n from products
       union all select 'orders', count(*)::int from orders
       union all select 'customers', count(*)::int from customers
       union all select 'media', count(*)::int from media
       union all select 'audit_log', count(*)::int from audit_log`),
        query(`select * from email_log order by created_at desc limit 50`),
        query(`select id, user_id, ip, user_agent, created_at, expires_at from admin_sessions where revoked_at is null and expires_at > now()`),
    ]);
    res.json({
        runtime: {
            node: process.version,
            uptimeSeconds: Math.round(process.uptime()),
            memoryMb: Math.round(process.memoryUsage().rss / 1048576),
            env: process.env.NODE_ENV,
        },
        tables: tables[0]?.n ?? 0,
        counts: sizes,
        emailLog,
        sessions,
    });
});
adminRouter.post("/system/cache/clear", requireDeveloper, async (req, res) => {
    invalidateSettings();
    resetTransport();
    await audit(req, "system.cache.clear", "settings");
    res.json({ ok: true });
});
adminRouter.post("/system/sessions/revoke-all", requireDeveloper, async (req, res) => {
    await query(`update admin_sessions set revoked_at = now() where user_id <> $1 and revoked_at is null`, [req.admin.id]);
    await audit(req, "system.sessions.revoke_all", "admin_sessions");
    res.json({ ok: true });
});
//# sourceMappingURL=admin.js.map