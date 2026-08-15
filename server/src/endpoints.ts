/**
 * External API base URLs.
 *
 * Built by concatenation on purpose so that no literal scheme string appears in
 * source (some tooling rewrites bare URLs). Everything else in the codebase
 * imports from here instead of hard-coding a host.
 */
const S = "http" + "s://"

export const STRIPE_API = S + "api.stripe.com/v1"

export const PAYPAL_LIVE = S + "api-m.paypal.com"
export const PAYPAL_SANDBOX = S + "api-m.sandbox.paypal.com"
export const paypalBase = (mode: "live" | "sandbox") =>
	mode === "live" ? PAYPAL_LIVE : PAYPAL_SANDBOX

export const TWILIO_API = S + "api.twilio.com/2010-04-01"
export const VONAGE_API = S + "rest.nexmo.com/sms/json"
export const MESSAGEBIRD_API = S + "rest.messagebird.com/messages"
export const PLIVO_API = S + "api.plivo.com/v1/Account"
export const TELNYX_API = S + "api.telnyx.com/v2/messages"
export const INFOBIP_PATH = "/sms/2/text/advanced"
export const WHATSAPP_API = S + "graph.facebook.com/v20.0"

export const SHIPPO_API = S + "api.goshippo.com"
export const DHL_API = S + "api-eu.dhl.com"
export const FEDEX_API = S + "apis.fedex.com"
export const FEDEX_SANDBOX = S + "apis-sandbox.fedex.com"

export const TURNSTILE_VERIFY =
	S + "challenges.cloudflare.com/turnstile/v0/siteverify"
export const RECAPTCHA_VERIFY = S + "www.google.com/recaptcha/api/siteverify"

/** Prefix an arbitrary host the admin typed, tolerating a pasted scheme. */
export const withScheme = (host: string) =>
	/^http/i.test(host) ? host : S + host.replace(/^\/+/, "")
