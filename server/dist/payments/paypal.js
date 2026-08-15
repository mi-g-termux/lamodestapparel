/**
 * PayPal Orders v2 + Payments v2, over the real REST API with fetch.
 *
 * Sandbox and live differ only by host, so the admin's "Sandbox mode" switch is
 * all that separates testing from taking money.
 */
import crypto from "node:crypto";
import { paypalBase } from "../endpoints.js";
export class PayPalError extends Error {
    debugId;
    status;
    constructor(message, debugId, status) {
        super(message);
        this.debugId = debugId;
        this.status = status;
        this.name = "PayPalError";
    }
}
/** PayPal wants decimal strings, we keep integer minor units. */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "HUF", "TWD"]);
export function toDecimal(minor, currency) {
    const c = currency.toUpperCase();
    if (ZERO_DECIMAL.has(c))
        return String(Math.round(minor / 100));
    return (Math.round(minor) / 100).toFixed(2);
}
export function fromDecimal(value, currency) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return 0;
    return ZERO_DECIMAL.has(currency.toUpperCase())
        ? Math.round(n * 100)
        : Math.round(n * 100);
}
/** Access tokens last ~9 hours; cache per credential set. */
const tokenCache = new Map();
async function accessToken(cfg) {
    if (!cfg.clientId || !cfg.clientSecret) {
        throw new PayPalError("PayPal is switched on but the client ID and secret have not been saved in Settings → Payments.");
    }
    const cacheKey = `${cfg.mode}:${cfg.clientId}`;
    const hit = tokenCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now() + 60_000)
        return hit.token;
    const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
    const res = await fetch(`${paypalBase(cfg.mode)}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) {
        tokenCache.delete(cacheKey);
        throw new PayPalError(json.error_description ??
            `PayPal rejected the credentials (${res.status}). Check the client ID and secret, and that they match the ${cfg.mode} environment.`, json.debug_id, res.status);
    }
    tokenCache.set(cacheKey, {
        token: json.access_token,
        expiresAt: Date.now() + Number(json.expires_in ?? 3600) * 1000,
    });
    return json.access_token;
}
export function clearTokenCache() {
    tokenCache.clear();
}
async function call(cfg, method, path, body, opts = {}) {
    const token = await accessToken(cfg);
    const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
    // PayPal's idempotency header.
    if (opts.requestId)
        headers["PayPal-Request-Id"] = opts.requestId;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    let res;
    try {
        res = await fetch(`${paypalBase(cfg.mode)}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });
    }
    catch (err) {
        clearTimeout(timer);
        throw new PayPalError(err?.name === "AbortError"
            ? "PayPal did not respond in time. Please try again."
            : `Could not reach PayPal: ${err?.message ?? "network error"}`);
    }
    clearTimeout(timer);
    const text = await res.text();
    const json = text ? safeJson(text) : {};
    if (!res.ok) {
        const detail = json?.details?.[0];
        throw new PayPalError(detail?.description ??
            json?.message ??
            `PayPal returned ${res.status}`, json?.debug_id, res.status);
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
/** For the admin panel's "Test connection" button. */
export async function verifyCredentials(cfg) {
    try {
        await accessToken(cfg);
        return { ok: true, mode: cfg.mode };
    }
    catch (err) {
        return { ok: false, mode: cfg.mode, error: err.message };
    }
}
/**
 * Create the PayPal order and hand back the approval link. Amounts come from
 * our own database, and PayPal independently checks that the breakdown adds up
 * to the total — a useful second opinion.
 */
export async function createOrder(cfg, args) {
    const currency = args.currency.toUpperCase();
    const body = {
        intent: "CAPTURE",
        purchase_units: [
            {
                reference_id: args.orderId,
                custom_id: args.orderId,
                invoice_id: args.orderNumber,
                description: `${args.storeName} order ${args.orderNumber}`.slice(0, 127),
                amount: {
                    currency_code: currency,
                    value: toDecimal(args.totalMinor, currency),
                    breakdown: {
                        item_total: {
                            currency_code: currency,
                            value: toDecimal(args.itemsSubtotalMinor, currency),
                        },
                        shipping: {
                            currency_code: currency,
                            value: toDecimal(args.shippingMinor, currency),
                        },
                        tax_total: {
                            currency_code: currency,
                            value: toDecimal(args.taxMinor, currency),
                        },
                        discount: {
                            currency_code: currency,
                            value: toDecimal(args.discountMinor, currency),
                        },
                    },
                },
                items: args.lines.map((l) => ({
                    name: l.name.slice(0, 127),
                    sku: l.sku?.slice(0, 127),
                    quantity: String(l.quantity),
                    unit_amount: {
                        currency_code: currency,
                        value: toDecimal(l.amountMinor, currency),
                    },
                })),
            },
        ],
        payment_source: {
            paypal: {
                email_address: args.customerEmail,
                experience_context: {
                    brand_name: args.storeName.slice(0, 127),
                    shipping_preference: "NO_SHIPPING",
                    user_action: "PAY_NOW",
                    return_url: args.returnUrl,
                    cancel_url: args.cancelUrl,
                },
            },
        },
    };
    const order = await call(cfg, "POST", "/v2/checkout/orders", body, {
        requestId: `order_${args.orderId}`,
    });
    const approve = (order.links ?? []).find((l) => l.rel === "payer-action" || l.rel === "approve");
    if (!approve?.href) {
        throw new PayPalError("PayPal created the order but returned no approval link.");
    }
    return { id: order.id, approveUrl: approve.href };
}
export async function getOrder(cfg, id) {
    return call(cfg, "GET", `/v2/checkout/orders/${encodeURIComponent(id)}`);
}
/**
 * Capture the money. Returns the authoritative amount PayPal actually took, in
 * minor units, so we reconcile against our own total rather than trusting the
 * browser.
 */
export async function captureOrder(cfg, id) {
    let result;
    try {
        result = await call(cfg, "POST", `/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {}, { requestId: `capture_${id}` });
    }
    catch (err) {
        // Already captured (double click, or webhook beat the redirect back).
        if (/ORDER_ALREADY_CAPTURED/i.test(err?.message ?? "")) {
            result = await getOrder(cfg, id);
        }
        else {
            throw err;
        }
    }
    const unit = result?.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    const currency = capture?.amount?.currency_code ?? "";
    return {
        status: capture?.status ?? result?.status ?? "UNKNOWN",
        captureId: capture?.id,
        amountMinor: capture?.amount?.value
            ? fromDecimal(capture.amount.value, currency)
            : 0,
        currency,
        payerEmail: result?.payer?.email_address,
        raw: result,
    };
}
export async function refundCapture(cfg, args) {
    const body = {};
    if (args.amountMinor !== undefined) {
        body.amount = {
            currency_code: args.currency.toUpperCase(),
            value: toDecimal(args.amountMinor, args.currency),
        };
    }
    if (args.note)
        body.note_to_payer = args.note.slice(0, 255);
    const r = await call(cfg, "POST", `/v2/payments/captures/${encodeURIComponent(args.captureId)}/refund`, body, { requestId: args.requestId });
    return {
        id: r.id,
        status: r.status,
        amountMinor: r?.amount?.value
            ? fromDecimal(r.amount.value, r.amount.currency_code)
            : (args.amountMinor ?? 0),
    };
}
/**
 * Verify a webhook by asking PayPal to check the signature for us. This is the
 * method PayPal recommends and it needs no certificate handling on our side.
 */
export async function verifyWebhook(cfg, headers, rawBody) {
    if (!cfg.webhookId) {
        return { ok: false, reason: "No webhook ID saved in Settings → Payments" };
    }
    const h = (name) => {
        const v = headers[name] ?? headers[name.toLowerCase()];
        return Array.isArray(v) ? v[0] : v;
    };
    let event;
    try {
        event = JSON.parse(rawBody);
    }
    catch {
        return { ok: false, reason: "Body was not valid JSON" };
    }
    try {
        const res = await call(cfg, "POST", "/v1/notifications/verify-webhook-signature", {
            auth_algo: h("paypal-auth-algo"),
            cert_url: h("paypal-cert-url"),
            transmission_id: h("paypal-transmission-id"),
            transmission_sig: h("paypal-transmission-sig"),
            transmission_time: h("paypal-transmission-time"),
            webhook_id: cfg.webhookId,
            webhook_event: event,
        });
        if (res?.verification_status !== "SUCCESS") {
            return { ok: false, reason: "PayPal reported signature failure" };
        }
        return { ok: true, event };
    }
    catch (err) {
        return { ok: false, reason: err.message };
    }
}
/** Stable id for logging webhook deliveries without storing the whole body. */
export function eventFingerprint(rawBody) {
    return crypto.createHash("sha256").update(rawBody).digest("hex").slice(0, 32);
}
//# sourceMappingURL=paypal.js.map