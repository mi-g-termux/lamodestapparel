import { Router, type Request, type Response } from "express";
import { query, one } from "../db.js";
import { getPublicSettings, getNamespace, featureOn } from "../settings.js";
import {
  pricingContext, present, countryFromHeaders, CURRENCY_META, getAllRates,
} from "../fx.js";
import { createOrder } from "../orders.js";
import { renderInvoicePdf } from "../invoice.js";
import { rateLimit } from "../security.js";
import { notifyContactMessage } from "../notifications.js";

/**
 * The storefront API. Everything here is public, read-mostly and rate limited.
 * Prices always come back in the visitor's own currency AND in base minor
 * units, so the client never has to do FX maths itself.
 */
export const publicRouter: Router = Router();

async function ctxFor(req: Request) {
  const requested = String(req.query.currency ?? req.headers["x-currency"] ?? "") || null;
  const country =
    (String(req.query.country ?? "") || null) ??
    countryFromHeaders(req.headers as Record<string, unknown>);
  return pricingContext(requested, country ?? countryFromHeaders(req.headers as Record<string, unknown>));
}

/* ---------------- bootstrap: settings + theme + nav + currency ---------- */

publicRouter.get("/bootstrap", async (req: Request, res: Response) => {
  const [settings, ctx] = await Promise.all([getPublicSettings(), ctxFor(req)]);
  const [nav, footer, rates] = await Promise.all([
    query(`select id, label, href, parent_id, position from navigation_items
            where menu = 'header' and visible order by position`),
    query(`select id, menu, label, href, position from navigation_items
            where menu like 'footer%' and visible order by menu, position`),
    getAllRates(ctx.base),
  ]);

  res.json({
    ...settings,
    navigation: { header: nav, footer },
    pricing: {
      base: ctx.base,
      display: ctx.display,
      rate: ctx.rate,
      symbol: ctx.symbol,
      decimals: ctx.displayDecimals,
      detectedCountry: countryFromHeaders(req.headers as Record<string, unknown>),
      available: Object.keys(rates)
        .filter((c) => CURRENCY_META[c])
        .map((c) => ({ code: c, symbol: CURRENCY_META[c]!.symbol, name: CURRENCY_META[c]!.name, rate: rates[c] })),
    },
  });
});

/* ---------------- content: banners, pages, testimonials ----------------- */

publicRouter.get("/banners", async (req: Request, res: Response) => {
  const placement = String(req.query.placement ?? "");
  const flagFor: Record<string, string> = {
    hero: "hero_slider", promo: "promo_banner", announcement: "announcement_bar", strip: "feature_strip",
  };
  if (placement && flagFor[placement] && !(await featureOn(flagFor[placement]!))) {
    res.json({ banners: [] });
    return;
  }
  const rows = await query(
    `select b.id, b.placement, b.title, b.subtitle, b.body, b.cta_label, b.cta_href,
            coalesce(m.url, b.image_url) as image_url, b.bg_color, b.text_color, b.position
       from banners b left join media m on m.id = b.media_id
      where b.active
        and (b.starts_at is null or b.starts_at <= now())
        and (b.ends_at   is null or b.ends_at   >= now())
        and ($1 = '' or b.placement = $1)
      order by b.placement, b.position`,
    [placement],
  );
  res.json({ banners: rows });
});

publicRouter.get("/pages/:slug", async (req: Request, res: Response) => {
  const page = await one(
    `select slug, title, body, seo_title, seo_description, updated_at
       from pages where slug = $1 and published`,
    [req.params.slug],
  );
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  res.json({ page });
});

publicRouter.get("/testimonials", async (_req: Request, res: Response) => {
  if (!(await featureOn("testimonials"))) {
    res.json({ testimonials: [] });
    return;
  }
  res.json({
    testimonials: await query(
      `select id, author, role, body, rating, avatar_url from testimonials where active order by position`,
    ),
  });
});

/* ---------------- catalogue --------------------------------------------- */

async function decorateProducts(rows: Record<string, unknown>[], ctx: Awaited<ReturnType<typeof pricingContext>>) {
  const ids = rows.map((r) => String(r.id));
  if (!ids.length) return [];
  const images = await query<{ product_id: string; url: string; alt: string; position: number }>(
    `select pi.product_id, m.url, m.alt, pi.position
       from product_images pi join media m on m.id = pi.media_id
      where pi.product_id = any($1::uuid[]) order by pi.position`,
    [ids],
  );
  const cats = await query<{ product_id: string; slug: string; name: string }>(
    `select pc.product_id, c.slug, c.name from product_categories pc
       join categories c on c.id = pc.category_id where pc.product_id = any($1::uuid[])`,
    [ids],
  );
  return rows.map((r) => {
    const id = String(r.id);
    const price = present(Number(r.price_minor ?? 0), ctx);
    const compare = r.compare_at_minor ? present(Number(r.compare_at_minor), ctx) : null;
    return {
      ...r,
      images: images.filter((i) => i.product_id === id).map((i) => ({ url: i.url, alt: i.alt })),
      categories: cats.filter((c) => c.product_id === id).map((c) => ({ slug: c.slug, name: c.name })),
      price: { minor: price.minor, formatted: price.formatted, currency: ctx.display, base_minor: Number(r.price_minor ?? 0) },
      compare_at: compare ? { minor: compare.minor, formatted: compare.formatted } : null,
      in_stock: r.track_stock === false || Number(r.stock ?? 0) > 0,
    };
  });
}

publicRouter.get("/products", async (req: Request, res: Response) => {
  const ctx = await ctxFor(req);
  const limit = Math.min(60, Math.max(1, Number(req.query.limit ?? 24)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));
  const search = String(req.query.q ?? "").trim();
  const category = String(req.query.category ?? "").trim();
  const featured = req.query.featured === "true";
  const sort = String(req.query.sort ?? "newest");

  const order =
    sort === "price_asc" ? "p.price_minor asc" :
    sort === "price_desc" ? "p.price_minor desc" :
    sort === "title" ? "p.title asc" : "p.created_at desc";

  const rows = await query(
    `select distinct p.* from products p
       left join product_categories pc on pc.product_id = p.id
       left join categories c on c.id = pc.category_id
      where p.status = 'active'
        and ($1 = '' or p.title ilike '%' || $1 || '%' or p.description ilike '%' || $1 || '%')
        and ($2 = '' or c.slug = $2)
        and ($3 = false or p.featured)
      order by ${order} limit $4 offset $5`,
    [search, category, featured, limit, offset],
  );

  const total = await one<{ n: number }>(
    `select count(distinct p.id)::int as n from products p
       left join product_categories pc on pc.product_id = p.id
       left join categories c on c.id = pc.category_id
      where p.status = 'active'
        and ($1 = '' or p.title ilike '%' || $1 || '%' or p.description ilike '%' || $1 || '%')
        and ($2 = '' or c.slug = $2)
        and ($3 = false or p.featured)`,
    [search, category, featured],
  );

  res.json({ products: await decorateProducts(rows, ctx), total: total?.n ?? 0, limit, offset });
});

publicRouter.get("/products/:slug", async (req: Request, res: Response) => {
  const ctx = await ctxFor(req);
  const row = await one(`select * from products where slug = $1 and status = 'active'`, [req.params.slug]);
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const [product] = await decorateProducts([row], ctx);
  const variants = await query<{ id: string; title: string; options: unknown; sku: string | null; price_minor: number | null; stock: number }>(
    `select id, title, options, sku, price_minor, stock from product_variants where product_id = $1 order by position`,
    [String(row.id)],
  );
  const reviews = (await featureOn("reviews"))
    ? await query(
        `select author, rating, title, body, created_at from product_reviews
          where product_id = $1 and state = 'published' order by created_at desc limit 30`,
        [String(row.id)],
      )
    : [];

  res.json({
    product: {
      ...product,
      variants: variants.map((v) => {
        const p = present(v.price_minor ?? Number(row.price_minor ?? 0), ctx);
        return { ...v, price: { minor: p.minor, formatted: p.formatted } };
      }),
      reviews,
    },
  });
});

publicRouter.get("/categories", async (_req: Request, res: Response) => {
  res.json({
    categories: await query(
      `select c.id, c.slug, c.name, c.description, m.url as image_url,
              (select count(*)::int from product_categories pc
                 join products p on p.id = pc.product_id
                where pc.category_id = c.id and p.status = 'active') as product_count
         from categories c left join media m on m.id = c.image_id
        where c.visible order by c.position, c.name`,
    ),
  });
});

/* ---------------- currency switcher ------------------------------------- */

publicRouter.get("/currencies", async (req: Request, res: Response) => {
  const ctx = await ctxFor(req);
  const rates = await getAllRates(ctx.base);
  res.json({
    base: ctx.base,
    display: ctx.display,
    detected: countryFromHeaders(req.headers as Record<string, unknown>),
    currencies: Object.entries(rates)
      .filter(([code]) => CURRENCY_META[code])
      .map(([code, rate]) => ({
        code, rate,
        symbol: CURRENCY_META[code]!.symbol,
        name: CURRENCY_META[code]!.name,
        decimals: CURRENCY_META[code]!.decimals,
      })),
  });
});

/* ---------------- checkout ---------------------------------------------- */

publicRouter.post("/checkout", rateLimit("checkout", 12, 600), async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const ctx = await ctxFor(req);

  const result = await createOrder({
    email: String(body.email ?? ""),
    phone: body.phone ? String(body.phone) : null,
    items: Array.isArray(body.items)
      ? (body.items as Record<string, unknown>[]).map((i) => ({
          productId: String(i.productId ?? i.product_id ?? ""),
          variantId: i.variantId ? String(i.variantId) : null,
          qty: Number(i.qty ?? 1),
        }))
      : [],
    shippingAddress: (body.shippingAddress ?? null) as Record<string, unknown> | null,
    billingAddress: (body.billingAddress ?? null) as Record<string, unknown> | null,
    couponCode: body.couponCode ? String(body.couponCode) : null,
    paymentMethod: body.paymentMethod ? String(body.paymentMethod) : "cod",
    shippingMethod: body.shippingMethod ? String(body.shippingMethod) : null,
    customerNote: body.customerNote ? String(body.customerNote) : null,
    displayCurrency: ctx.display,
    country: countryFromHeaders(req.headers as Record<string, unknown>),
  });

  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.status(201).json({ orderId: result.orderId, number: result.number });
});

/* ---------------- order lookup / tracking / invoice --------------------- */

async function findOrder(numberOrId: string, email: string) {
  return one<Record<string, unknown>>(
    `select * from orders where (number = $1 or id::text = $1) and lower(email) = lower($2)`,
    [numberOrId, email],
  );
}

publicRouter.get("/orders/lookup", rateLimit("order_lookup", 30, 600), async (req: Request, res: Response) => {
  const number = String(req.query.number ?? "");
  const email = String(req.query.email ?? "");
  if (!number || !email) {
    res.status(400).json({ error: "Order number and email are both required." });
    return;
  }
  const order = await findOrder(number, email);
  if (!order) {
    res.status(404).json({ error: "We could not find that order." });
    return;
  }
  const items = await query(`select title, variant_title, qty, unit_price_minor, total_minor, image_url from order_items where order_id = $1`, [order.id]);
  const history = await query(
    `select field, to_value, note, created_at from order_status_history where order_id = $1 and field = 'status' order by created_at`,
    [order.id],
  );
  res.json({ order, items, history });
});

publicRouter.get("/orders/:id/invoice.pdf", rateLimit("invoice", 30, 600), async (req: Request, res: Response) => {
  if (!(await featureOn("invoice_download_customer"))) {
    res.status(403).json({ error: "Invoice downloads are turned off." });
    return;
  }
  const email = String(req.query.email ?? "");
  const order = await findOrder(String(req.params.id), email);
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  const pdf = await renderInvoicePdf(String(order.id));
  if (!pdf) {
    res.status(500).json({ error: "Could not build the invoice." });
    return;
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.number}.pdf"`);
  res.send(pdf);
});

/* ---------------- small forms ------------------------------------------- */

publicRouter.post("/newsletter", rateLimit("newsletter", 6, 600), async (req: Request, res: Response) => {
  if (!(await featureOn("newsletter"))) {
    res.status(403).json({ error: "Newsletter signup is turned off." });
    return;
  }
  const email = String((req.body as Record<string, unknown>)?.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  await query(
    `insert into newsletter_subscribers (email, source) values ($1,'storefront')
     on conflict (email) do update set status = 'subscribed'`,
    [email],
  );
  res.json({ ok: true });
});

publicRouter.post("/contact", rateLimit("contact", 6, 600), async (req: Request, res: Response) => {
  if (!(await featureOn("contact_form"))) {
    res.status(403).json({ error: "The contact form is turned off." });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const name = String(b.name ?? "").trim().slice(0, 120);
  const email = String(b.email ?? "").trim().toLowerCase();
  const subject = String(b.subject ?? "").trim().slice(0, 200);
  const message = String(b.message ?? b.body ?? "").trim().slice(0, 5000);
  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ error: "Please fill in your name, a valid email and a message." });
    return;
  }
  await query(`insert into contact_messages (name, email, subject, body) values ($1,$2,$3,$4)`, [name, email, subject, message]);
  void notifyContactMessage({ name, email, subject, body: message });
  res.json({ ok: true });
});

publicRouter.post("/reviews", rateLimit("review", 5, 3600), async (req: Request, res: Response) => {
  if (!(await featureOn("reviews"))) {
    res.status(403).json({ error: "Reviews are turned off." });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const rating = Math.max(1, Math.min(5, Number(b.rating ?? 5)));
  const productId = String(b.productId ?? "");
  if (!productId) {
    res.status(400).json({ error: "Missing product." });
    return;
  }
  const moderate = await featureOn("review_moderation");
  await query(
    `insert into product_reviews (product_id, author, email, rating, title, body, state)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [
      productId,
      String(b.author ?? "Anonymous").slice(0, 100),
      b.email ? String(b.email) : null,
      rating,
      b.title ? String(b.title).slice(0, 160) : null,
      String(b.body ?? "").slice(0, 4000),
      moderate ? "pending" : "published",
    ],
  );
  res.json({ ok: true, moderated: moderate });
});

publicRouter.post("/back-in-stock", rateLimit("bis", 10, 3600), async (req: Request, res: Response) => {
  if (!(await featureOn("back_in_stock"))) {
    res.status(403).json({ error: "This feature is turned off." });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !b.productId) {
    res.status(400).json({ error: "A valid email and product are required." });
    return;
  }
  await query(`insert into stock_notifications (product_id, variant_id, email) values ($1,$2,$3)`, [
    String(b.productId), b.variantId ? String(b.variantId) : null, email,
  ]);
  res.json({ ok: true });
});

publicRouter.post("/coupons/validate", rateLimit("coupon", 20, 600), async (req: Request, res: Response) => {
  const code = String((req.body as Record<string, unknown>)?.code ?? "").trim();
  const subtotal = Number((req.body as Record<string, unknown>)?.subtotalMinor ?? 0);
  const c = await one<{ code: string; type: string; value: number; min_spend_minor: number; usage_limit: number | null; used_count: number; active: boolean; starts_at: string | null; ends_at: string | null }>(
    `select * from coupons where lower(code) = lower($1)`, [code],
  );
  const now = Date.now();
  const ok =
    !!c && c.active &&
    (!c.starts_at || new Date(c.starts_at).getTime() <= now) &&
    (!c.ends_at || new Date(c.ends_at).getTime() >= now) &&
    (c.usage_limit === null || c.used_count < c.usage_limit) &&
    subtotal >= c.min_spend_minor;

  if (!ok || !c) {
    res.status(400).json({ error: "That code is not valid for this basket." });
    return;
  }
  const discount = c.type === "percent" ? Math.round(subtotal * (Number(c.value) / 100))
    : c.type === "fixed" ? Math.min(subtotal, Math.round(Number(c.value) * 100)) : 0;
  res.json({ ok: true, code: c.code, type: c.type, discountMinor: discount });
});
