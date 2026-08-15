import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { env, isProd } from "./env.js";
import { query, one } from "./db.js";

/* ------------------------------------------------------------------ *
 * Passwords — scrypt, no native deps, constant-time comparison.
 * ------------------------------------------------------------------ */
const SCRYPT_N = 16384;

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(plain, salt, 64, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [scheme, n, saltHex, keyHex] = stored.split("$");
    if (scheme !== "scrypt" || !n || !saltHex || !keyHex) return false;
    const key = crypto.scryptSync(plain, Buffer.from(saltHex, "hex"), 64, { N: Number(n) });
    const expected = Buffer.from(keyHex, "hex");
    return key.length === expected.length && crypto.timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

export function passwordProblems(pw: string): string[] {
  const out: string[] = [];
  if (pw.length < 12) out.push("must be at least 12 characters");
  if (!/[a-z]/.test(pw)) out.push("needs a lowercase letter");
  if (!/[A-Z]/.test(pw)) out.push("needs an uppercase letter");
  if (!/[0-9]/.test(pw)) out.push("needs a number");
  if (/^(password|velora|admin|12345)/i.test(pw)) out.push("is too predictable");
  return out;
}

/* ------------------------------------------------------------------ *
 * Encryption at rest for secrets stored in `settings` (SMTP password,
 * payment API keys). AES-256-GCM keyed from APP_SECRET.
 * ------------------------------------------------------------------ */
const aesKey = crypto.createHash("sha256").update(env.APP_SECRET).digest();

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `enc:v1:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  if (!stored) return "";
  if (!stored.startsWith("enc:v1:")) return stored; // legacy/plain
  try {
    const [, , ivB, tagB, dataB] = stored.split(":");
    const d = crypto.createDecipheriv("aes-256-gcm", aesKey, Buffer.from(ivB!, "base64"));
    d.setAuthTag(Buffer.from(tagB!, "base64"));
    return Buffer.concat([d.update(Buffer.from(dataB!, "base64")), d.final()]).toString("utf8");
  } catch {
    return "";
  }
}

/** Never leak a secret to the browser — show only whether one is set. */
export const SECRET_MASK = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

/* ------------------------------------------------------------------ *
 * Sessions — opaque random token in an httpOnly cookie; only the SHA-256
 * of the token is stored, so a database leak cannot mint sessions.
 * ------------------------------------------------------------------ */
export const ADMIN_COOKIE = "velora_admin";
export const CUSTOMER_COOKIE = "velora_customer";
export const CSRF_COOKIE = "velora_csrf";
const SESSION_DAYS = 7;

export const sha256 = (v: string): string =>
  crypto.createHash("sha256").update(v).digest("hex");

export function newToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export function setCookie(
  res: Response,
  name: string,
  value: string,
  opts: { days?: number; httpOnly?: boolean; path?: string } = {},
): void {
  const { days = SESSION_DAYS, httpOnly = true, path = "/" } = opts;
  const bits = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${Math.floor(days * 86400)}`,
    "SameSite=Lax",
  ];
  if (httpOnly) bits.push("HttpOnly");
  if (isProd) bits.push("Secure");
  appendCookie(res, bits.join("; "));
}

export function clearCookie(res: Response, name: string, path = "/"): void {
  appendCookie(res, `${name}=; Path=${path}; Max-Age=0; SameSite=Lax${isProd ? "; Secure" : ""}`);
}

function appendCookie(res: Response, cookie: string): void {
  const prev = res.getHeader("Set-Cookie");
  const list = Array.isArray(prev) ? prev : prev ? [String(prev)] : [];
  res.setHeader("Set-Cookie", [...list, cookie]);
}

export async function createSession(
  userId: string,
  req: Request,
  res: Response,
): Promise<void> {
  const token = newToken();
  await query(
    `insert into admin_sessions (user_id, token_hash, ip, user_agent, expires_at)
     values ($1,$2,$3,$4, now() + interval '${SESSION_DAYS} days')`,
    [userId, sha256(token), clientIp(req), String(req.headers["user-agent"] ?? "").slice(0, 300)],
  );
  setCookie(res, ADMIN_COOKIE, token);
  // Double-submit CSRF token: readable by JS, echoed back in a header.
  setCookie(res, CSRF_COOKIE, newToken(), { httpOnly: false });
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token = readCookie(req, ADMIN_COOKIE);
  if (token) {
    await query(`update admin_sessions set revoked_at = now() where token_hash = $1`, [
      sha256(token),
    ]);
  }
  clearCookie(res, ADMIN_COOKIE);
  clearCookie(res, CSRF_COOKIE);
}

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  overrides: string[];
  status: string;
  avatar_url: string | null;
  must_change_password: boolean;
};

export async function userFromRequest(req: Request): Promise<AdminUser | null> {
  const token = readCookie(req, ADMIN_COOKIE);
  if (!token) return null;
  const row = await one<AdminUser & { session_id: string }>(
    `select u.id, u.email, u.name, u.role, u.overrides, u.status, u.avatar_url,
            u.must_change_password, s.id as session_id
       from admin_sessions s
       join admin_users u on u.id = s.user_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
        and u.status = 'active'`,
    [sha256(token)],
  );
  return row;
}

/* ------------------------------------------------------------------ *
 * Brute-force ladder (spec §4.2): 5→15m, 6→30m, 7→1h, 8→4h, 9→12h, 10+→24h
 * ------------------------------------------------------------------ */
const LADDER = [15, 30, 60, 240, 720, 1440];

export function lockoutMinutesFor(failures: number): number {
  if (failures < 5) return 0;
  return LADDER[Math.min(failures - 5, LADDER.length - 1)]!;
}

/* ------------------------------------------------------------------ *
 * Sliding-window rate limiting, stored in Postgres so it also works on
 * serverless where in-memory counters reset on every cold start.
 * ------------------------------------------------------------------ */
export function clientIp(req: Request): string {
  const fwd = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim();
  return (env.TRUST_PROXY === "true" && fwd) || req.ip || req.socket.remoteAddress || "0.0.0.0";
}

export function rateLimit(bucket: string, limit: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = clientIp(req);
    try {
      await query(`delete from rate_limits where created_at < now() - interval '1 day'`);
      const rows = await query<{ n: number }>(
        `select count(*)::int as n from rate_limits
          where bucket = $1 and ip = $2 and created_at > now() - ($3 || ' seconds')::interval`,
        [bucket, ip, String(windowSeconds)],
      );
      if ((rows[0]?.n ?? 0) >= limit) {
        res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
        return;
      }
      await query(`insert into rate_limits (bucket, ip) values ($1,$2)`, [bucket, ip]);
    } catch {
      // Never let the limiter take the site down.
    }
    next();
  };
}

/* ------------------------------------------------------------------ *
 * CSRF — double-submit cookie on every state-changing admin request.
 * ------------------------------------------------------------------ */
/**
 * Give every visitor a CSRF token cookie, reusing the one they already have.
 *
 * Unlike the session cookie this one is deliberately NOT HttpOnly: the whole
 * point of the double-submit pattern is that our own JavaScript can read it and
 * echo it back in the x-csrf-token header, which a cross-site attacker cannot
 * do because they cannot read our cookies.
 */
export function issueCsrfCookie(req: Request, res: Response): string {
  const existing = readCookie(req, CSRF_COOKIE);
  if (existing && existing.length >= 32) return existing;
  const token = newToken();
  setCookie(res, CSRF_COOKIE, token, { httpOnly: false, days: 1 });
  return token;
}

export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const cookie = readCookie(req, CSRF_COOKIE);
  const header = String(req.headers["x-csrf-token"] ?? "");
  if (!cookie || !header || cookie.length !== header.length ||
      !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
    res.status(403).json({ error: "Invalid or missing CSRF token. Refresh the page and try again." });
    return;
  }
  next();
}

/* ------------------------------------------------------------------ *
 * Security headers (CSP, clickjacking, MIME sniffing, referrer...).
 * ------------------------------------------------------------------ */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self' https:",
      "upgrade-insecure-requests",
    ].join("; "),
  );
  if (isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  res.removeHeader("X-Powered-By");
  next();
}

/* ------------------------------------------------------------------ *
 * Roles & permissions
 * ------------------------------------------------------------------ */
export const ALL_PERMISSIONS = [
  "dashboard.view",
  "product.read", "product.create", "product.update", "product.delete",
  "order.read", "order.update", "order.status.update", "order.refund", "order.delete",
  "invoice.download",
  "customer.read", "customer.update", "customer.export",
  "discount.manage",
  "content.manage",
  "media.manage",
  "report.revenue.view",
  "settings.read", "settings.write",
  "settings.payments.read", "settings.payments.write",
  "settings.smtp.read", "settings.smtp.write",
  "features.manage",
  "user.manage",
  "audit.view",
  "system.manage",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

const ROLE_PERMS: Record<string, Permission[] | "*"> = {
  super_admin: "*",
  developer: "*",
  admin: ALL_PERMISSIONS.filter((p) => p !== "system.manage" && p !== "user.manage") as Permission[],
  manager: [
    "dashboard.view", "product.read", "product.create", "product.update",
    "order.read", "order.update", "order.status.update", "invoice.download",
    "customer.read", "customer.update", "discount.manage", "content.manage",
    "media.manage", "report.revenue.view", "settings.read",
  ],
  staff: [
    "dashboard.view", "product.read", "order.read", "order.status.update",
    "invoice.download", "customer.read",
  ],
  fulfilment: ["dashboard.view", "order.read", "order.status.update", "invoice.download", "product.read"],
  support: ["dashboard.view", "order.read", "customer.read", "customer.update", "invoice.download"],
  auditor: ["dashboard.view", "order.read", "product.read", "customer.read", "report.revenue.view", "audit.view"],
};

export function permissionsFor(role: string, overrides: string[] = []): Set<string> {
  const base = ROLE_PERMS[role];
  const set = new Set<string>(base === "*" ? ALL_PERMISSIONS : (base ?? []));
  for (const o of overrides) {
    if (o.startsWith("-")) set.delete(o.slice(1));
    else set.add(o);
  }
  return set;
}

export function can(user: AdminUser | null, permission: Permission): boolean {
  if (!user) return false;
  const overrides = Array.isArray(user.overrides) ? user.overrides : [];
  return permissionsFor(user.role, overrides).has(permission);
}

/** Developer/System zone — only these roles may ever enter it. */
export function isDeveloperZone(user: AdminUser | null): boolean {
  return user?.role === "super_admin" || user?.role === "developer";
}
