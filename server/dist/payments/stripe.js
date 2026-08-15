/**
 * Stripe, called over the real REST API with fetch — no SDK, so nothing extra
 * to install and nothing to go stale.
 *
 * The only thing this file cannot supply is your secret key. Paste it in
 * Settings → Payments → Stripe and every function below starts making live
 * calls immediately.
 */
import crypto from "node:crypto";
import { STRIPE_API } from "../endpoints.js";
export class StripeError extends Error {
    type;
    status;
    constructor(message, type, status) {
        super(message);
        this.type = type;
        this.status = status;
        this.name = "StripeError";
    }
}
/** Currencies Stripe treats as having no minor unit. */
const ZERO_DECIMAL = new Set([
    "BIF",
    "CLP",
    "DJF",
    "GNF",
    "JPY",
    "KMF",
    "KRW",
    "MGA",
    "PYG",
    "RWF",
    "UGX",
    "VND",
    "VUV",
    "XAF",
    "XOF",
    "XPF",
]);
/**
 * Our ledger stores everything in minor units (pence, cents). Stripe agrees,
 * apart from the zero-decimal currencies where it wants whole units.
 */
export function toStripeAmount(minor, currency) {
    return ZERO_DECIMAL.has(currency.toUpperCase())
        ? Math.round(minor / 100)
        : Math.round(minor);
}
export function fromStripeAmount(amount, currency) {
    return ZERO_DECIMAL.has(currency.toUpperCase())
        ? Math.round(amount * 100)
        : Math.round(amount);
}
/** Stripe's API is form-encoded, including nested keys like `metadata[order]`. */
function encodeForm(value, prefix = "", out = []) {
    if (value === undefined || value === null)
        return out;
    if (Array.isArray(value)) {
        value.forEach((item, i) => encodeForm(item, `${prefix}[${i}]`, out));
        return out;
    }
    if (typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
            encodeForm(v, prefix ? `${prefix}[${k}]` : k, out);
        }
        return out;
    }
    out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
    return out;
}
async function call(cfg, method, path, body, opts = {}) {
    if (!cfg.secretKey) {
        throw new StripeError("Stripe is switched on but no secret key has been saved in Settings → Payments.", "config");
    }
    const headers = {
        Authorization: `Bearer ${cfg.secretKey}`,
        "Stripe-Version": "2024-06-20",
    };
    if (opts.idempotencyKey)
        headers["Idempotency-Key"] = opts.idempotencyKey;
    let url = `${STRIPE_API}${path}`;
    let payload;
    if (body && method === "POST") {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        payload = encodeForm(body).join("&");
    }
    else if (body) {
        const qs = encodeForm(body).join("&");
        if (qs)
            url += `?${qs}`;
    }
    // Fail fast rather than hanging a checkout request.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    let res;
    try {
        res = await fetch(url, {
            method,
            headers,
            body: payload,
            signal: controller.signal,
        });
    }
    catch (err) {
        clearTimeout(timer);
        throw new StripeError(err?.name === "AbortError"
            ? "Stripe did not respond in time. Please try again."
            : `Could not reach Stripe: ${err?.message ?? "network error"}`, "network");
    }
    clearTimeout(timer);
    const text = await res.text();
    const json = text ? safeJson(text) : {};
    if (!res.ok) {
        const e = json?.error ?? {};
        throw new StripeError(e.message ?? `Stripe returned ${res.status}`, e.type ?? "api_error", res.status);
    }
    return json;
}
function safeJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return { raw: text };
    }
}
/** Cheap credential check for the "Test connection" button in the admin panel. */
export async function verifyKey(cfg) {
    const mode = cfg.secretKey.startsWith("sk_live") ? "live" : "test";
    try {
        const acct = await call(cfg, "GET", "/balance");
        return { ok: true, mode, account: acct?.livemode ? "live" : "test" };
    }
    catch (err) {
        return { ok: false, mode, error: err.message };
    }
}
/**
 * Hosted Checkout. We deliberately do not let the browser choose amounts —
 * every figure here comes from the order we just wrote to Postgres.
 */
export async function createCheckoutSession(cfg, args) {
    const currency = args.currency.toLowerCase();
    const line_items = args.lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
            currency,
            unit_amount: toStripeAmount(l.amountMinor, args.currency),
            product_data: { name: l.name.slice(0, 250) },
        },
    }));
    if (args.shippingMinor && args.shippingMinor > 0) {
        line_items.push({
            quantity: 1,
            price_data: {
                currency,
                unit_amount: toStripeAmount(args.shippingMinor, args.currency),
                product_data: { name: "Shipping" },
            },
        });
    }
    if (args.taxMinor && args.taxMinor > 0) {
        line_items.push({
            quantity: 1,
            price_data: {
                currency,
                unit_amount: toStripeAmount(args.taxMinor, args.currency),
                product_data: { name: "Tax" },
            },
        });
    }
    const body = {
        mode: "payment",
        line_items,
        success_url: args.successUrl,
        cancel_url: args.cancelUrl,
        client_reference_id: args.orderId,
        metadata: { order_id: args.orderId, order_number: args.orderNumber },
        payment_intent_data: {
            metadata: { order_id: args.orderId, order_number: args.orderNumber },
            description: `${args.storeName} order ${args.orderNumber}`,
        },
    };
    if (args.customerEmail)
        body.customer_email = args.customerEmail;
    if (cfg.statementDescriptor) {
        ;
        body.payment_intent_data.statement_descriptor_suffix =
            cfg.statementDescriptor.slice(0, 22);
    }
    // A discount is expressed as a one-off coupon so the shopper sees it.
    if (args.discountMinor && args.discountMinor > 0) {
        const coupon = await call(cfg, "POST", "/coupons", {
            amount_off: toStripeAmount(args.discountMinor, args.currency),
            currency,
            duration: "once",
            name: "Discount",
        }, { idempotencyKey: `coupon_${args.orderId}` });
        body.discounts = [{ coupon: coupon.id }];
    }
    const session = await call(cfg, "POST", "/checkout/sessions", body, {
        // Two clicks on "Pay" must not create two sessions.
        idempotencyKey: `checkout_${args.orderId}`,
    });
    return { id: session.id, url: session.url };
}
export async function retrieveSession(cfg, id) {
    return call(cfg, "GET", `/checkout/sessions/${encodeURIComponent(id)}`, {
        expand: ["payment_intent"],
    });
}
export async function retrievePaymentIntent(cfg, id) {
    return call(cfg, "GET", `/payment_intents/${encodeURIComponent(id)}`);
}
/** Full or partial refund. `amountMinor` omitted means refund everything. */
export async function refund(cfg, args) {
    const body = {
        payment_intent: args.paymentIntentId,
        reason: args.reason ?? "requested_by_customer",
    };
    if (args.amountMinor !== undefined) {
        body.amount = toStripeAmount(args.amountMinor, args.currency);
    }
    const r = await call(cfg, "POST", "/refunds", body, {
        idempotencyKey: args.idempotencyKey,
    });
    return {
        id: r.id,
        status: r.status,
        amountMinor: fromStripeAmount(r.amount, args.currency),
    };
}
/**
 * Verify a webhook exactly the way Stripe documents it: HMAC-SHA256 over
 * `timestamp.rawBody`, timing-safe compare, and reject anything older than the
 * tolerance so a captured request cannot be replayed.
 *
 * `rawBody` must be the untouched bytes — never a re-serialised object.
 */
export function verifyWebhook(rawBody, signatureHeader, webhookSecret, toleranceSeconds = 300) {
    if (!webhookSecret)
        return { ok: false, reason: "No webhook secret saved" };
    if (!signatureHeader)
        return { ok: false, reason: "Missing Stripe-Signature" };
    const parts = signatureHeader.split(",").reduce((acc, part) => {
        const [k, v] = part.split("=");
        if (!k || !v)
            return acc;
        (acc[k.trim()] ??= []).push(v.trim());
        return acc;
    }, {});
    const timestamp = parts.t?.[0];
    const provided = parts.v1 ?? [];
    if (!timestamp || provided.length === 0) {
        return { ok: false, reason: "Malformed signature header" };
    }
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(age) || age > toleranceSeconds) {
        return { ok: false, reason: "Signature timestamp outside tolerance" };
    }
    const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const expected = crypto
        .createHmac("sha256", webhookSecret)
        .update(`${timestamp}.${payload}`, "utf8")
        .digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const matched = provided.some((sig) => {
        const sigBuf = Buffer.from(sig, "utf8");
        return (sigBuf.length === expectedBuf.length &&
            crypto.timingSafeEqual(sigBuf, expectedBuf));
    });
    if (!matched)
        return { ok: false, reason: "Signature mismatch" };
    try {
        return { ok: true, event: JSON.parse(payload) };
    }
    catch {
        return { ok: false, reason: "Body was not valid JSON" };
    }
}
//# sourceMappingURL=stripe.js.map