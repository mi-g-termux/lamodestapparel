import { Router, type Request, type Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { query } from "../db.js";
import { env } from "../env.js";
import { refreshRates } from "../fx.js";
import { getSettings } from "../settings.js";
import { pushNotification } from "../notifications.js";

/**
 * Scheduled jobs. Protected by CRON_SECRET, sent either as
 * `Authorization: Bearer <secret>` (Vercel Cron) or `?key=<secret>` (cPanel curl).
 */
export const cronRouter: Router = Router();

function authorised(req: Request): boolean {
  if (!env.CRON_SECRET) return false;
  const header = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const supplied = header || String(req.query.key ?? "");
  if (supplied.length !== env.CRON_SECRET.length) return false;
  try {
    return timingSafeEqual(Buffer.from(supplied), Buffer.from(env.CRON_SECRET));
  } catch {
    return false;
  }
}

cronRouter.use((req: Request, res: Response, next) => {
  if (!authorised(req)) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  next();
});

/** Hourly: keep GBP→USD (and every other pair) fresh. */
cronRouter.all("/fx", async (_req: Request, res: Response) => {
  res.json(await refreshRates());
});

/** Nightly: clear expired sessions, old rate-limit buckets and stale attempts. */
cronRouter.all("/cleanup", async (_req: Request, res: Response) => {
  const sessions = await query(`delete from admin_sessions where expires_at < now() - interval '2 days' returning id`);
  const buckets = await query(`delete from rate_limits where window_start < now() - interval '1 day' returning id`);
  const attempts = await query(`delete from login_attempts where created_at < now() - interval '30 days' returning id`);
  const carts = await query(`delete from carts where updated_at < now() - interval '30 days' returning id`);
  res.json({
    sessions: sessions.length, rateLimits: buckets.length,
    loginAttempts: attempts.length, carts: carts.length,
  });
});

/** Every 15 minutes: warn about low stock once a day per product. */
cronRouter.all("/low-stock", async (_req: Request, res: Response) => {
  const s = await getSettings();
  if (s.notifications?.on_low_stock === false) {
    res.json({ skipped: true });
    return;
  }
  const rows = await query<{ id: string; title: string; stock: number }>(
    `select id, title, stock from products
      where track_stock and status = 'active' and stock <= low_stock_at
        and id not in (
          select (data->>'productId')::uuid from notifications
           where kind = 'low_stock' and created_at > now() - interval '1 day'
             and data ? 'productId')`,
  );
  for (const p of rows) {
    await pushNotification({
      kind: "low_stock",
      title: "Low stock",
      body: `${p.title} is down to ${p.stock}.`,
      href: `/admin/products/${p.id}`,
      data: { productId: p.id },
    });
  }
  res.json({ flagged: rows.length });
});

/** Every 10 minutes: mark abandoned unpaid orders as failed after 24h. */
cronRouter.all("/stuck-payments", async (_req: Request, res: Response) => {
  const rows = await query(
    `update orders set status = 'failed', updated_at = now()
      where payment_status = 'unpaid' and status = 'pending'
        and payment_method not in ('cod','bank_transfer')
        and placed_at < now() - interval '24 hours'
      returning id, number`,
  );
  res.json({ failed: rows.length });
});

/** Health probe for uptime monitors (also allowed without the secret via /api/health). */
cronRouter.all("/ping", (_req: Request, res: Response) => {
  res.json({ ok: true, at: new Date().toISOString() });
});
