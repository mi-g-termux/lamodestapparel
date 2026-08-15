/**
 * Payment provider registry.
 *
 * Every provider is loaded from the `payments` settings namespace, which the
 * admin panel writes. Nothing here reads an environment variable, so switching
 * from sandbox to live is a click in the panel, not a redeploy.
 */
import { getSettings } from "../settings.js";
import * as stripe from "./stripe.js";
import * as paypal from "./paypal.js";
export class PaymentError extends Error {
    provider;
    status;
    constructor(message, provider, status = 400) {
        super(message);
        this.provider = provider;
        this.status = status;
        this.name = "PaymentError";
    }
}
/**
 * Read the `payments` namespace and bridge every key alias.
 *
 * The settings schema is the single source of truth for what the admin panel is
 * allowed to save (the save route rejects unknown keys). Historically some rows
 * were written under shorter names, and the bank fields are stored as
 * `bank_transfer_*` while the rest of the code reads `bank_*`. Rather than let
 * a mismatch silently swallow a credential an admin has typed in, we accept
 * either spelling and fill in the other. A blank string counts as missing.
 */
async function paymentSettings() {
    const all = await getSettings();
    const p = { ...(all?.payments ?? {}) };
    const pick = (...keys) => {
        for (const k of keys) {
            const v = p[k];
            if (v === true || v === false || typeof v === "number")
                return v;
            if (typeof v === "string" && v.trim() !== "")
                return v;
        }
        return undefined;
    };
    /** Write the resolved value under every alias so all readers agree. */
    const unify = (...keys) => {
        const v = pick(...keys);
        if (v === undefined)
            return;
        for (const k of keys)
            p[k] = v;
    };
    unify("bank_transfer_enabled", "bank_enabled");
    unify("bank_transfer_instructions", "bank_instructions");
    unify("paypal_client_secret", "paypal_secret");
    unify("cod_instructions", "cod_description");
    return p;
}
const truthy = (v) => v === true || v === "true" || v === 1 || v === "1";
const text = (v) => (typeof v === "string" ? v.trim() : "");
export async function stripeConfig() {
    const p = await paymentSettings();
    if (!truthy(p.stripe_enabled))
        return null;
    const secretKey = text(p.stripe_secret_key);
    if (!secretKey)
        return null;
    return {
        secretKey,
        publishableKey: text(p.stripe_publishable_key) || undefined,
        webhookSecret: text(p.stripe_webhook_secret) || undefined,
        statementDescriptor: text(p.stripe_statement_descriptor) || undefined,
    };
}
export async function paypalConfig() {
    const p = await paymentSettings();
    if (!truthy(p.paypal_enabled))
        return null;
    const clientId = text(p.paypal_client_id);
    const clientSecret = text(p.paypal_client_secret);
    if (!clientId || !clientSecret)
        return null;
    return {
        clientId,
        clientSecret,
        mode: truthy(p.paypal_sandbox) ? "sandbox" : "live",
        webhookId: text(p.paypal_webhook_id) || undefined,
    };
}
/**
 * What the storefront checkout page is allowed to offer. A provider only
 * appears once it is both switched on *and* fully configured, so a shopper can
 * never pick a method that will fail at the last step.
 */
export async function availableMethods() {
    const p = await paymentSettings();
    const out = [];
    const stripeCfg = await stripeConfig();
    if (stripeCfg) {
        out.push({
            id: "stripe",
            label: text(p.stripe_label) || "Card",
            description: text(p.stripe_description) ||
                "Pay securely by card. You will be taken to our payment provider.",
            flow: "redirect",
            ready: true,
        });
    }
    const paypalCfg = await paypalConfig();
    if (paypalCfg) {
        out.push({
            id: "paypal",
            label: text(p.paypal_label) || "PayPal",
            description: text(p.paypal_description) || "Pay with your PayPal balance or card.",
            flow: "redirect",
            ready: true,
        });
    }
    if (truthy(p.cod_enabled)) {
        out.push({
            id: "cod",
            label: text(p.cod_label) || "Cash on delivery",
            description: text(p.cod_instructions) || "Pay the courier when your order arrives.",
            flow: "offline",
            ready: true,
        });
    }
    if (truthy(p.bank_enabled)) {
        out.push({
            id: "bank_transfer",
            label: text(p.bank_label) || "Bank transfer",
            description: text(p.bank_instructions) ||
                "We will email you our bank details. Your order ships once payment clears.",
            flow: "offline",
            ready: true,
        });
    }
    return out;
}
export async function methodIsAllowed(id) {
    const methods = await availableMethods();
    return methods.some((m) => m.id === id && m.ready);
}
/** Offline instructions to show on the thank-you page and in the email. */
export async function offlineInstructions(id) {
    const p = await paymentSettings();
    if (id === "bank_transfer") {
        const lines = [
            text(p.bank_instructions),
            text(p.bank_account_name) && `Account name: ${text(p.bank_account_name)}`,
            text(p.bank_account_number) &&
                `Account number: ${text(p.bank_account_number)}`,
            text(p.bank_sort_code) && `Sort code: ${text(p.bank_sort_code)}`,
            text(p.bank_iban) && `IBAN: ${text(p.bank_iban)}`,
            text(p.bank_swift) && `SWIFT/BIC: ${text(p.bank_swift)}`,
            text(p.bank_reference_note) ||
                "Please quote your order number as the payment reference.",
        ].filter(Boolean);
        return lines.join("\n");
    }
    if (id === "cod") {
        return (text(p.cod_instructions) ||
            "Please have the exact amount ready for the courier.");
    }
    return "";
}
/**
 * Refund through whichever provider took the money. The caller has already
 * checked permissions and written the refund row; this only talks to the
 * gateway and reports back what really happened.
 */
export async function refundViaProvider(args) {
    switch (args.provider) {
        case "stripe": {
            const cfg = await stripeConfig();
            if (!cfg)
                throw new PaymentError("Stripe is not configured.", "stripe");
            if (!args.providerReference) {
                throw new PaymentError("This order has no Stripe payment reference, so it cannot be refunded automatically.", "stripe");
            }
            const r = await stripe.refund(cfg, {
                paymentIntentId: args.providerReference,
                amountMinor: args.amountMinor,
                currency: args.currency,
                idempotencyKey: args.idempotencyKey,
            });
            return { handled: true, reference: r.id, status: r.status };
        }
        case "paypal": {
            const cfg = await paypalConfig();
            if (!cfg)
                throw new PaymentError("PayPal is not configured.", "paypal");
            const captureId = args.captureReference ?? args.providerReference;
            if (!captureId) {
                throw new PaymentError("This order has no PayPal capture reference, so it cannot be refunded automatically.", "paypal");
            }
            const r = await paypal.refundCapture(cfg, {
                captureId,
                amountMinor: args.amountMinor,
                currency: args.currency,
                note: args.reason,
                requestId: args.idempotencyKey,
            });
            return { handled: true, reference: r.id, status: r.status };
        }
        default:
            // COD, bank transfer and manual payments are refunded outside the system.
            return { handled: false, status: "manual" };
    }
}
/** Powers the "Test connection" buttons in Settings → Payments. */
export async function testProvider(id) {
    if (id === "stripe") {
        const cfg = await stripeConfig();
        if (!cfg) {
            return {
                ok: false,
                detail: "Switch Stripe on and save a secret key first.",
            };
        }
        const r = await stripe.verifyKey(cfg);
        return {
            ok: r.ok,
            detail: r.ok
                ? `Connected to Stripe in ${r.mode} mode.`
                : (r.error ?? "Stripe rejected the key."),
        };
    }
    if (id === "paypal") {
        const cfg = await paypalConfig();
        if (!cfg) {
            return {
                ok: false,
                detail: "Switch PayPal on and save a client ID and secret first.",
            };
        }
        const r = await paypal.verifyCredentials(cfg);
        return {
            ok: r.ok,
            detail: r.ok
                ? `Connected to PayPal in ${r.mode} mode.`
                : (r.error ?? "PayPal rejected the credentials."),
        };
    }
    return { ok: true, detail: "This method needs no connection test." };
}
export { stripe, paypal };
//# sourceMappingURL=index.js.map