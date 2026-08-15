import { Router } from "express";
import { query, one } from "../db.js";
import { can, clientIp } from "../security.js";
import { getSettingsForClient, saveSettings, auditWrite } from "../settings.js";
/**
 * Bridge between the admin UI's document-shaped state and the real database.
 *
 * GET  /api/admin/state  → builds the admin document from live tables.
 * PUT  /api/admin/state  → writes the collections the UI edited back to tables.
 *
 * This is what lets the existing admin screens keep their shape while every
 * number on them comes from Postgres instead of localStorage.
 */
export const stateRouter = Router();
const iso = (v) => (v ? new Date(String(v)).toISOString() : new Date().toISOString());
/* ---------------------------- read -------------------------------------- */
stateRouter.get("/", async (req, res) => {
    const user = req.admin;
    // User must be authenticated to access state
    if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }
    const [media, products, variants, images, categories, orders, orderItems, history, customers, reviews, coupons, messages, subscribers, staff, audit, banners, pages, navigation, testimonials, invoices, notifications] = await Promise.all([
        query(`select * from media order by created_at desc limit 500`),
        query(`select * from products order by created_at desc`),
        query(`select * from product_variants order by position`),
        query(`select pi.*, m.url, m.alt from product_images pi join media m on m.id = pi.media_id order by pi.position`),
        query(`select * from categories order by position, name`),
        can(user, "order.read") ? query(`select * from orders order by placed_at desc limit 1000`) : Promise.resolve([]),
        can(user, "order.read") ? query(`select * from order_items`) : Promise.resolve([]),
        can(user, "order.read") ? query(`select * from order_status_history order by created_at`) : Promise.resolve([]),
        can(user, "customer.read") ? query(`select * from customers order by created_at desc limit 1000`) : Promise.resolve([]),
        query(`select * from product_reviews order by created_at desc limit 500`),
        query(`select * from coupons order by created_at desc`),
        query(`select * from contact_messages order by created_at desc limit 300`),
        query(`select * from newsletter_subscribers order by created_at desc limit 1000`),
        can(user, "user.manage")
            ? query(`select id, email, name, role, status, overrides, last_login_at, failed_attempts, locked_until, created_at from admin_users order by created_at`)
            : query(`select id, email, name, role, status, overrides, last_login_at from admin_users where id = $1`, [user.id]),
        can(user, "audit.view") ? query(`select * from audit_log order by created_at desc limit 400`) : Promise.resolve([]),
        query(`select b.*, m.url as media_url from banners b left join media m on m.id = b.media_id order by b.placement, b.position`),
        query(`select * from pages order by title`),
        query(`select * from navigation_items order by menu, position`),
        query(`select * from testimonials order by position`),
        query(`select * from invoices`),
        query(`select * from notifications order by created_at desc limit 100`),
    ]);
    const settings = await getSettingsForClient();
    const productDocs = products.map((p) => {
        const id = String(p.id);
        const gallery = images.filter((i) => String(i.product_id) === id);
        return {
            id,
            name: p.title,
            slug: p.slug,
            status: p.status,
            publishAt: iso(p.published_at ?? p.created_at),
            category: "",
            collection: "",
            brand: p.brand ?? "",
            tags: p.tags ?? [],
            badge: p.badge ?? "",
            shortDescription: p.subtitle ?? "",
            longDescription: p.description ?? "",
            details: [],
            primaryImageId: gallery[0] ? String(gallery[0].media_id) : null,
            galleryIds: gallery.map((g) => String(g.media_id)),
            galleryByColour: {},
            price: Number(p.price_minor ?? 0),
            compareAt: p.compare_at_minor === null || p.compare_at_minor === undefined ? null : Number(p.compare_at_minor),
            cost: Number(p.cost_minor ?? 0),
            taxClass: p.tax_class ?? "standard",
            options: [],
            variants: variants
                .filter((v) => String(v.product_id) === id)
                .map((v) => ({
                id: String(v.id),
                title: v.title,
                sku: v.sku ?? "",
                price: v.price_minor === null ? Number(p.price_minor ?? 0) : Number(v.price_minor),
                stock: Number(v.stock ?? 0),
                options: v.options ?? {},
            })),
            trackInventory: p.track_stock !== false,
            backorder: "deny",
            lowStock: Number(p.low_stock_at ?? 5),
            incoming: 0,
            weightG: Number(p.weight_grams ?? 0),
            dimensionsCm: { l: 0, w: 0, h: 0 },
            shipsAlone: false,
            ratingOverride: p.rating_override === null || p.rating_override === undefined ? null : Number(p.rating_override),
            sku: p.sku ?? "",
            barcode: p.barcode ?? "",
            stock: Number(p.stock ?? 0),
            featured: p.featured === true,
            seoTitle: p.seo_title ?? "",
            seoDescription: p.seo_description ?? "",
            createdAt: iso(p.created_at),
            updatedAt: iso(p.updated_at),
        };
    });
    const orderDocs = orders.map((o) => {
        const id = String(o.id);
        const invoice = invoices.find((i) => String(i.order_id) === id);
        const ship = (o.shipping_address ?? {});
        return {
            id,
            number: o.number,
            customerId: "",
            customerName: String(ship.name ?? o.email ?? ""),
            email: o.email,
            phone: o.phone ?? "",
            placedAt: iso(o.placed_at),
            status: o.status,
            payment: o.payment_status,
            fulfillment: o.fulfillment_status,
            method: o.payment_method ?? "",
            device: "Desktop",
            channel: "Online store",
            country: String(ship.country ?? ""),
            city: String(ship.city ?? ""),
            couponCode: o.coupon_code ?? null,
            currency: o.currency,
            fxRate: Number(o.fx_rate ?? 1),
            items: orderItems
                .filter((i) => String(i.order_id) === id)
                .map((i) => ({
                id: String(i.id),
                productId: i.product_id ? String(i.product_id) : "",
                variantId: i.variant_id ? String(i.variant_id) : "",
                name: i.title,
                variant: i.variant_title ?? "",
                sku: i.sku ?? "",
                image: i.image_url ?? "",
                qty: Number(i.qty),
                price: Number(i.unit_price_minor),
                total: Number(i.total_minor),
            })),
            subtotalMinor: Number(o.subtotal_minor ?? 0),
            discountMinor: Number(o.discount_minor ?? 0),
            shippingMinor: Number(o.shipping_minor ?? 0),
            shippingCostMinor: Number(o.shipping_minor ?? 0),
            taxMinor: Number(o.tax_minor ?? 0),
            totalMinor: Number(o.total_minor ?? 0),
            refundedMinor: Number(o.refunded_minor ?? 0),
            courier: o.courier ?? null,
            tracking: o.tracking_number ?? null,
            trackingUrl: o.tracking_url ?? null,
            shippingAddress: ship,
            billingAddress: (o.billing_address ?? ship),
            notes: o.staff_note ? [{ at: iso(o.updated_at), text: String(o.staff_note), actor: "Staff" }] : [],
            history: history
                .filter((h) => String(h.order_id) === id)
                .map((h) => ({ at: iso(h.created_at), label: `${h.field}: ${h.to_value}`, actor: h.actor ?? "System", note: h.note ?? "" })),
            isFirstOrder: false,
            invoiceNumber: invoice ? String(invoice.number) : null,
            invoiceUrl: `/api/admin/orders/${id}/invoice.pdf`,
        };
    });
    res.json({
        media: media.map((m) => ({
            id: String(m.id),
            url: m.url,
            filename: m.filename ?? "",
            alt: m.alt ?? "",
            folder: m.folder ?? "misc",
            width: Number(m.width ?? 0),
            height: Number(m.height ?? 0),
            bytes: Number(m.bytes ?? 0),
            mime: m.mime ?? "image/jpeg",
            focal: { x: 0.5, y: 0.5 },
            createdAt: iso(m.created_at),
        })),
        products: productDocs,
        categories: categories.map((c) => ({
            id: String(c.id), name: c.name, slug: c.slug,
            description: c.description ?? "", imageId: c.image_id ? String(c.image_id) : null,
            visible: c.visible !== false, position: Number(c.position ?? 0),
        })),
        orders: orderDocs,
        customers: customers.map((c) => ({
            id: String(c.id), name: c.name ?? "", email: c.email, phone: c.phone ?? "",
            createdAt: iso(c.created_at), marketingOptIn: c.marketing_opt_in === true,
            ordersCount: Number(c.orders_count ?? 0), spentMinor: Number(c.spent_minor ?? 0),
        })),
        reviews: reviews.map((r) => ({
            id: String(r.id), productId: String(r.product_id), author: r.author,
            rating: Number(r.rating), title: r.title ?? "", body: r.body ?? "",
            state: r.state, createdAt: iso(r.created_at),
        })),
        discounts: coupons.map((c) => ({
            id: String(c.id), code: c.code, type: c.type, value: Number(c.value),
            minSpendMinor: Number(c.min_spend_minor ?? 0), usageLimit: c.usage_limit,
            used: Number(c.used_count ?? 0), active: c.active !== false,
            startsAt: c.starts_at ? iso(c.starts_at) : null, endsAt: c.ends_at ? iso(c.ends_at) : null,
        })),
        messages: messages.map((m) => ({
            id: String(m.id), name: m.name, email: m.email, subject: m.subject ?? "",
            body: m.body, state: m.state ?? "new", createdAt: iso(m.created_at),
        })),
        subscribers: subscribers.map((s) => ({
            id: String(s.id), email: s.email, status: s.status ?? "subscribed", createdAt: iso(s.created_at),
        })),
        staff: staff.map((s) => ({
            id: String(s.id), name: s.name, email: s.email, role: s.role, status: s.status,
            permissions: s.overrides ?? [], lastLogin: s.last_login_at ? iso(s.last_login_at) : null,
            failedAttempts: Number(s.failed_attempts ?? 0),
            lockedUntil: s.locked_until ? iso(s.locked_until) : null,
        })),
        audit: audit.map((a) => ({
            id: String(a.id), at: iso(a.created_at), actor: a.actor_name ?? "System",
            action: a.action, entity: a.entity ?? "", ip: a.ip ?? "",
            before: a.before_value ?? null, after: a.after_value ?? null,
        })),
        notifications: notifications.map((n) => ({
            id: String(n.id), kind: n.kind, title: n.title, body: n.body ?? "",
            href: n.href ?? "", read: n.read_at !== null, createdAt: iso(n.created_at),
        })),
        content: {
            banners: banners.map((b) => ({
                id: String(b.id), placement: b.placement, title: b.title ?? "", subtitle: b.subtitle ?? "",
                body: b.body ?? "", ctaLabel: b.cta_label ?? "", ctaHref: b.cta_href ?? "",
                imageId: b.media_id ? String(b.media_id) : null, imageUrl: b.media_url ?? b.image_url ?? "",
                bgColor: b.bg_color ?? "", textColor: b.text_color ?? "",
                position: Number(b.position ?? 0), active: b.active !== false,
                startsAt: b.starts_at ? iso(b.starts_at) : null, endsAt: b.ends_at ? iso(b.ends_at) : null,
            })),
            pages: pages.map((p) => ({
                id: String(p.id), slug: p.slug, title: p.title, body: p.body ?? "",
                published: p.published !== false, updatedAt: iso(p.updated_at),
            })),
            navigation: navigation.map((n) => ({
                id: String(n.id), menu: n.menu, label: n.label, href: n.href,
                position: Number(n.position ?? 0), visible: n.visible !== false,
            })),
            testimonials: testimonials.map((t) => ({
                id: String(t.id), author: t.author, role: t.role ?? "", body: t.body,
                rating: Number(t.rating ?? 5), avatarUrl: t.avatar_url ?? "",
                active: t.active !== false, position: Number(t.position ?? 0),
            })),
        },
        serverSettings: settings,
        auth: { userId: user.id, startedAt: new Date().toISOString() },
    });
});
const asDocs = (v) => (Array.isArray(v) ? v : []);
const isUuid = (v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
/**
 * Accepts the collections the UI changed and reconciles them into tables.
 * Only the sections the caller is allowed to touch are applied.
 */
stateRouter.put("/", async (req, res) => {
    const user = req.admin;
    const body = req.body;
    const applied = [];
    /* categories */
    if (body.categories && can(user, "product.update")) {
        for (const c of asDocs(body.categories)) {
            if (isUuid(c.id)) {
                await query(`update categories set name = $1, slug = $2, description = $3, image_id = $4,
                  visible = $5, position = $6 where id = $7`, [c.name, c.slug, c.description ?? "", isUuid(c.imageId) ? c.imageId : null, c.visible !== false, Number(c.position ?? 0), c.id]);
            }
            else {
                await query(`insert into categories (name, slug, description, image_id, visible, position)
           values ($1,$2,$3,$4,$5,$6) on conflict (slug) do update set name = excluded.name`, [c.name, c.slug, c.description ?? "", isUuid(c.imageId) ? c.imageId : null, c.visible !== false, Number(c.position ?? 0)]);
            }
        }
        applied.push("categories");
    }
    /* banners / sliders */
    if (body.banners && can(user, "content.manage")) {
        const keep = [];
        for (const b of asDocs(body.banners)) {
            const values = [
                b.placement ?? "hero", b.title ?? "", b.subtitle ?? "", b.body ?? "",
                b.ctaLabel ?? "", b.ctaHref ?? "", isUuid(b.imageId) ? b.imageId : null,
                b.bgColor ?? null, b.textColor ?? null, Number(b.position ?? 0), b.active !== false,
            ];
            if (isUuid(b.id)) {
                await query(`update banners set placement=$1, title=$2, subtitle=$3, body=$4, cta_label=$5,
                  cta_href=$6, media_id=$7, bg_color=$8, text_color=$9, position=$10, active=$11
            where id = $12`, [...values, b.id]);
                keep.push(String(b.id));
            }
            else {
                const row = await one(`insert into banners (placement, title, subtitle, body, cta_label, cta_href, media_id,
                                bg_color, text_color, position, active)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`, values);
                if (row)
                    keep.push(row.id);
            }
        }
        if (keep.length)
            await query(`delete from banners where id <> all($1::uuid[])`, [keep]);
        else
            await query(`delete from banners`);
        applied.push("banners");
    }
    /* navigation */
    if (body.navigation && can(user, "content.manage")) {
        await query(`delete from navigation_items`);
        for (const n of asDocs(body.navigation)) {
            await query(`insert into navigation_items (menu, label, href, position, visible) values ($1,$2,$3,$4,$5)`, [n.menu ?? "header", n.label ?? "", n.href ?? "/", Number(n.position ?? 0), n.visible !== false]);
        }
        applied.push("navigation");
    }
    /* cms pages */
    if (body.pages && can(user, "content.manage")) {
        for (const p of asDocs(body.pages)) {
            await query(`insert into pages (slug, title, body, published) values ($1,$2,$3,$4)
         on conflict (slug) do update set title = excluded.title, body = excluded.body,
           published = excluded.published, updated_at = now()`, [p.slug, p.title, p.body ?? "", p.published !== false]);
        }
        applied.push("pages");
    }
    /* testimonials */
    if (body.testimonials && can(user, "content.manage")) {
        await query(`delete from testimonials`);
        for (const t of asDocs(body.testimonials)) {
            await query(`insert into testimonials (author, role, body, rating, avatar_url, active, position)
         values ($1,$2,$3,$4,$5,$6,$7)`, [t.author ?? "", t.role ?? "", t.body ?? "", Number(t.rating ?? 5), t.avatarUrl ?? null, t.active !== false, Number(t.position ?? 0)]);
        }
        applied.push("testimonials");
    }
    /* settings namespaces */
    if (body.serverSettings && can(user, "settings.write")) {
        for (const [ns, value] of Object.entries(body.serverSettings)) {
            if (value && typeof value === "object")
                await saveSettings(ns, value);
        }
        applied.push("settings");
    }
    await auditWrite(user.id, user.name, "state.save", applied.join(", ") || "nothing", clientIp(req));
    res.json({ ok: true, applied });
});
//# sourceMappingURL=state.js.map