import nodemailer from "nodemailer";
import { query } from "./db.js";
import { getNamespace, getSettings } from "./settings.js";
import { env } from "./env.js";
let transporter = null;
let transporterKey = "";
function keyOf(c) {
    return `${c.host}|${c.port}|${c.secure}|${c.username}|${c.password.length}`;
}
export async function getSmtp() {
    const s = await getNamespace("smtp");
    return {
        enabled: s.enabled === true,
        host: String(s.host ?? ""),
        port: Number(s.port ?? 587),
        secure: s.secure === true,
        username: String(s.username ?? ""),
        password: String(s.password ?? ""),
        from_name: String(s.from_name ?? ""),
        from_email: String(s.from_email ?? ""),
        reply_to: String(s.reply_to ?? ""),
    };
}
async function getTransport(cfg) {
    const c = cfg ?? (await getSmtp());
    if (!c.host || !c.from_email)
        return null;
    const key = keyOf(c);
    if (transporter && key === transporterKey)
        return transporter;
    transporter = nodemailer.createTransport({
        host: c.host,
        port: c.port,
        secure: c.secure || c.port === 465,
        auth: c.username ? { user: c.username, pass: c.password } : undefined,
        tls: { minVersion: "TLSv1.2" },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
    });
    transporterKey = key;
    return transporter;
}
export function resetTransport() {
    transporter = null;
    transporterKey = "";
}
export async function sendMail(args) {
    const cfg = await getSmtp();
    const to = Array.isArray(args.to) ? args.to.filter(Boolean).join(", ") : args.to;
    if (!to)
        return { ok: false, error: "no recipient" };
    if (!cfg.enabled) {
        await logEmail(to, args.subject, args.template, "skipped", "SMTP disabled in settings");
        return { ok: false, error: "SMTP is turned off in Settings \u2192 Email" };
    }
    const tx = await getTransport(cfg);
    if (!tx) {
        await logEmail(to, args.subject, args.template, "failed", "SMTP not configured");
        return { ok: false, error: "SMTP host / from address is not configured" };
    }
    try {
        await tx.sendMail({
            from: cfg.from_name ? `"${cfg.from_name}" <${cfg.from_email}>` : cfg.from_email,
            to,
            replyTo: args.replyTo || cfg.reply_to || undefined,
            subject: args.subject,
            html: args.html,
            text: args.text ?? stripHtml(args.html),
        });
        await logEmail(to, args.subject, args.template, "sent");
        return { ok: true };
    }
    catch (err) {
        const message = err.message;
        await logEmail(to, args.subject, args.template, "failed", message);
        console.error("[mail] send failed:", message);
        return { ok: false, error: message };
    }
}
/** Used by the "Send test email" button in the admin panel. */
export async function verifySmtp() {
    const tx = await getTransport();
    if (!tx)
        return { ok: false, error: "SMTP host / from address is not configured" };
    try {
        await tx.verify();
        return { ok: true };
    }
    catch (err) {
        return { ok: false, error: err.message };
    }
}
async function logEmail(to, subject, template, status, error) {
    await query(`insert into email_log (to_email, subject, template, status, error) values ($1,$2,$3,$4,$5)`, [to.slice(0, 300), subject.slice(0, 300), template ?? null, status, error ?? null]).catch(() => { });
}
function stripHtml(html) {
    return html.replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
/* ------------------------------------------------------------------ *
 * Templates — branded with the store's own name and logo.
 * ------------------------------------------------------------------ */
export async function emailShell(bodyHtml, preheader = "") {
    const s = await getSettings();
    const b = s.branding ?? {};
    const t = s.theme ?? {};
    const name = String(b.store_name ?? "Store");
    const logo = String(b.email_logo_url || b.logo_url || "");
    const accent = String(t.primary ?? "#111111");
    const site = env.SITE_URL;
    const header = logo
        ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name)}" style="max-height:40px;display:block">`
        : `<span style="font-size:20px;font-weight:700;letter-spacing:-.02em">${escapeHtml(name)}</span>`;
    return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #f0efee">${header}</td></tr>
    <tr><td style="padding:28px;font-size:15px;line-height:1.6">${bodyHtml}</td></tr>
    <tr><td style="padding:20px 28px;background:#fafaf9;font-size:12px;color:#78716c;line-height:1.6">
      <a href="${escapeHtml(site)}" style="color:${escapeHtml(accent)};text-decoration:none">${escapeHtml(name)}</a>
      &nbsp;\u00b7&nbsp; This email was sent to you because you placed an order or subscribed.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}
export function button(label, href, colour = "#111111") {
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0"><tr>
<td style="background:${escapeHtml(colour)};border-radius:8px">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;color:#fff;text-decoration:none;font-weight:600;font-size:14px">${escapeHtml(label)}</a>
</td></tr></table>`;
}
export function escapeHtml(v) {
    return String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
//# sourceMappingURL=mailer.js.map