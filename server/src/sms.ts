/**
 * SMS and WhatsApp, over each provider's real REST API with fetch.
 *
 * Ships DISABLED. Nothing sends until an admin switches a provider on in
 * Settings → SMS and saves credentials — otherwise a test order would text real
 * strangers.
 */
import {
	TWILIO_API,
	VONAGE_API,
	MESSAGEBIRD_API,
	PLIVO_API,
	TELNYX_API,
	INFOBIP_PATH,
	WHATSAPP_API,
	withScheme,
} from "./endpoints.js"
import { getSettings } from "./settings.js"
import { query } from "./db.js"

export type SmsProviderId =
	| "twilio"
	| "vonage"
	| "messagebird"
	| "plivo"
	| "telnyx"
	| "infobip"
	| "whatsapp"
	| "generic"
	| "log"

export type SmsResult = {
	ok: boolean
	provider: SmsProviderId | "disabled"
	messageId?: string
	error?: string
}

const truthy = (v: unknown) => v === true || v === "true" || v === 1 || v === "1"
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "")

async function smsSettings(): Promise<Record<string, any>> {
	const all: any = await getSettings()
	return (all?.sms ?? {}) as Record<string, any>
}

/**
 * E.164 tidy-up. We do not pretend to be libphonenumber — we just refuse
 * anything that clearly is not dialable so providers do not bill us for junk.
 */
export function normalisePhone(
	raw: string,
	defaultCountryCode?: string,
): string | null {
	let n = raw.replace(/[^\d+]/g, "")
	if (n.startsWith("00")) n = `+${n.slice(2)}`
	if (!n.startsWith("+")) {
		const cc = (defaultCountryCode ?? "").replace(/[^\d]/g, "")
		if (!cc) return null
		n = `+${cc}${n.replace(/^0+/, "")}`
	}
	const digits = n.slice(1)
	if (digits.length < 8 || digits.length > 15) return null
	return n
}

async function post(
	url: string,
	init: RequestInit,
	timeoutMs = 15_000,
): Promise<{ ok: boolean; status: number; json: any; text: string }> {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)
	try {
		const res = await fetch(url, { ...init, signal: controller.signal })
		const body = await res.text()
		let json: any = null
		try {
			json = body ? JSON.parse(body) : null
		} catch {
			json = null
		}
		return { ok: res.ok, status: res.status, json, text: body }
	} finally {
		clearTimeout(timer)
	}
}

/**
 * Send one message. Never throws: SMS is a courtesy, and a texting outage must
 * not fail a checkout.
 */
export async function sendSms(args: {
	to: string
	body: string
	/** Set when this relates to an order, for the log. */
	orderId?: string
	kind?: string
}): Promise<SmsResult> {
	const s = await smsSettings()

	if (!truthy(s.enabled)) return { ok: false, provider: "disabled" }

	const provider = (text(s.provider) || "log") as SmsProviderId
	const to = normalisePhone(args.to, text(s.default_country_code))
	if (!to) {
		return {
			ok: false,
			provider,
			error: `"${args.to}" is not a usable phone number.`,
		}
	}

	const body = args.body.slice(0, 1500)
	let result: SmsResult

	try {
		result = await dispatch(provider, s, to, body)
	} catch (err: any) {
		result = {
			ok: false,
			provider,
			error:
				err?.name === "AbortError"
					? "The SMS provider did not respond in time."
					: (err?.message ?? "Unknown SMS error"),
		}
	}

	// Log every attempt so the admin can see what happened without guessing.
	try {
		await query(
			`insert into sms_log (provider, recipient, body, status, error, message_id, order_id, kind)
			 values ($1,$2,$3,$4,$5,$6,$7,$8)`,
			[
				provider,
				to,
				body,
				result.ok ? "sent" : "failed",
				result.error ?? null,
				result.messageId ?? null,
				args.orderId ?? null,
				args.kind ?? "manual",
			],
		)
	} catch {
		/* the log table is a convenience, not a dependency */
	}

	return result
}

async function dispatch(
	provider: SmsProviderId,
	s: Record<string, any>,
	to: string,
	body: string,
): Promise<SmsResult> {
	switch (provider) {
		case "twilio": {
			const sid = text(s.twilio_account_sid)
			const token = text(s.twilio_auth_token)
			const from = text(s.twilio_from)
			const service = text(s.twilio_messaging_service_sid)
			if (!sid || !token || (!from && !service)) {
				return { ok: false, provider, error: "Twilio credentials are incomplete." }
			}
			const form = new URLSearchParams({ To: to, Body: body })
			if (service) form.set("MessagingServiceSid", service)
			else form.set("From", from)

			const r = await post(
				`${TWILIO_API}/Accounts/${encodeURIComponent(sid)}/Messages.json`,
				{
					method: "POST",
					headers: {
						Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: form.toString(),
				},
			)
			return r.ok
				? { ok: true, provider, messageId: r.json?.sid }
				: { ok: false, provider, error: r.json?.message ?? `HTTP ${r.status}` }
		}

		case "vonage": {
			const key = text(s.vonage_api_key)
			const secret = text(s.vonage_api_secret)
			const from = text(s.vonage_from)
			if (!key || !secret || !from) {
				return { ok: false, provider, error: "Vonage credentials are incomplete." }
			}
			const r = await post(VONAGE_API, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					api_key: key,
					api_secret: secret,
					to: to.replace("+", ""),
					from,
					text: body,
				}),
			})
			const m = r.json?.messages?.[0]
			return m?.status === "0"
				? { ok: true, provider, messageId: m["message-id"] }
				: {
						ok: false,
						provider,
						error: m?.["error-text"] ?? `HTTP ${r.status}`,
					}
		}

		case "messagebird": {
			const key = text(s.messagebird_api_key)
			const from = text(s.messagebird_from) || "Store"
			if (!key) {
				return { ok: false, provider, error: "MessageBird API key is missing." }
			}
			const r = await post(MESSAGEBIRD_API, {
				method: "POST",
				headers: {
					Authorization: `AccessKey ${key}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ recipients: [to], originator: from, body }),
			})
			return r.ok
				? { ok: true, provider, messageId: r.json?.id }
				: {
						ok: false,
						provider,
						error: r.json?.errors?.[0]?.description ?? `HTTP ${r.status}`,
					}
		}

		case "plivo": {
			const id = text(s.plivo_auth_id)
			const token = text(s.plivo_auth_token)
			const from = text(s.plivo_from)
			if (!id || !token || !from) {
				return { ok: false, provider, error: "Plivo credentials are incomplete." }
			}
			const r = await post(
				`${PLIVO_API}/${encodeURIComponent(id)}/Message/`,
				{
					method: "POST",
					headers: {
						Authorization: `Basic ${Buffer.from(`${id}:${token}`).toString("base64")}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ src: from, dst: to, text: body }),
				},
			)
			return r.ok
				? { ok: true, provider, messageId: r.json?.message_uuid?.[0] }
				: { ok: false, provider, error: r.json?.error ?? `HTTP ${r.status}` }
		}

		case "telnyx": {
			const key = text(s.telnyx_api_key)
			const from = text(s.telnyx_from)
			if (!key || !from) {
				return { ok: false, provider, error: "Telnyx credentials are incomplete." }
			}
			const r = await post(TELNYX_API, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${key}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ from, to, text: body }),
			})
			return r.ok
				? { ok: true, provider, messageId: r.json?.data?.id }
				: {
						ok: false,
						provider,
						error: r.json?.errors?.[0]?.detail ?? `HTTP ${r.status}`,
					}
		}

		case "infobip": {
			const key = text(s.infobip_api_key)
			const host = text(s.infobip_base_url)
			const from = text(s.infobip_from) || "Store"
			if (!key || !host) {
				return { ok: false, provider, error: "Infobip credentials are incomplete." }
			}
			const r = await post(`${withScheme(host)}${INFOBIP_PATH}`, {
				method: "POST",
				headers: {
					Authorization: `App ${key}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					messages: [{ from, destinations: [{ to }], text: body }],
				}),
			})
			return r.ok
				? { ok: true, provider, messageId: r.json?.messages?.[0]?.messageId }
				: {
						ok: false,
						provider,
						error: r.json?.requestError?.serviceException?.text ?? `HTTP ${r.status}`,
					}
		}

		case "whatsapp": {
			const token = text(s.whatsapp_token)
			const phoneId = text(s.whatsapp_phone_number_id)
			const template = text(s.whatsapp_template_name)
			if (!token || !phoneId) {
				return {
					ok: false,
					provider,
					error: "WhatsApp Cloud API credentials are incomplete.",
				}
			}
			// Outside a 24-hour window WhatsApp only allows templates.
			const payload = template
				? {
						messaging_product: "whatsapp",
						to: to.replace("+", ""),
						type: "template",
						template: {
							name: template,
							language: { code: text(s.whatsapp_template_lang) || "en" },
							components: [
								{ type: "body", parameters: [{ type: "text", text: body }] },
							],
						},
					}
				: {
						messaging_product: "whatsapp",
						to: to.replace("+", ""),
						type: "text",
						text: { body },
					}
			const r = await post(
				`${WHATSAPP_API}/${encodeURIComponent(phoneId)}/messages`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				},
			)
			return r.ok
				? { ok: true, provider, messageId: r.json?.messages?.[0]?.id }
				: {
						ok: false,
						provider,
						error: r.json?.error?.message ?? `HTTP ${r.status}`,
					}
		}

		case "generic": {
			// Any provider with a JSON endpoint. Placeholders are substituted.
			const url = text(s.generic_url)
			if (!url) {
				return { ok: false, provider, error: "No generic SMS URL saved." }
			}
			const templateBody =
				text(s.generic_body_template) || '{"to":"{{to}}","text":"{{text}}"}'
			const filled = templateBody
				.split("{{to}}")
				.join(to)
				.split("{{text}}")
				.join(body.replace(/"/g, '\\"'))
			let headers: Record<string, string> = {
				"Content-Type": "application/json",
			}
			try {
				const extra = text(s.generic_headers)
				if (extra) headers = { ...headers, ...JSON.parse(extra) }
			} catch {
				return {
					ok: false,
					provider,
					error: "The custom headers field is not valid JSON.",
				}
			}
			const r = await post(withScheme(url), {
				method: text(s.generic_method) || "POST",
				headers,
				body: filled,
			})
			return r.ok
				? { ok: true, provider, messageId: r.json?.id ?? undefined }
				: { ok: false, provider, error: r.text.slice(0, 200) || `HTTP ${r.status}` }
		}

		case "log":
		default:
			// Safe default: prove the wiring works without spending money.
			console.log(`[sms:log] to ${to}: ${body}`)
			return { ok: true, provider: "log", messageId: `log_${Date.now()}` }
	}
}

/** "Send test SMS" button in Settings → SMS. */
export async function sendTestSms(to: string): Promise<SmsResult> {
	const all: any = await getSettings()
	const name = all?.branding?.store_name ?? "your store"
	return sendSms({
		to,
		body: `Test message from ${name}. If you can read this, SMS is working.`,
		kind: "test",
	})
}

/** Order-related texts, each gated by its own switch. */
export async function smsOrderPlaced(args: {
	orderId: string
	phone?: string | null
	orderNumber: string
	total: string
}) {
	const s = await smsSettings()
	if (!truthy(s.enabled) || !truthy(s.notify_order_placed) || !args.phone) return
	const all: any = await getSettings()
	const name = all?.branding?.store_name ?? "your order"
	await sendSms({
		to: args.phone,
		orderId: args.orderId,
		kind: "order_placed",
		body:
			text(s.template_order_placed)
				?.split("{{order}}")
				.join(args.orderNumber)
				.split("{{total}}")
				.join(args.total)
				.split("{{store}}")
				.join(name) ||
			`Thanks for your order ${args.orderNumber} (${args.total}). We will let you know when it ships. — ${name}`,
	})
}

export async function smsOrderShipped(args: {
	orderId: string
	phone?: string | null
	orderNumber: string
	tracking?: string | null
}) {
	const s = await smsSettings()
	if (!truthy(s.enabled) || !truthy(s.notify_order_shipped) || !args.phone) return
	const all: any = await getSettings()
	const name = all?.branding?.store_name ?? "your store"
	await sendSms({
		to: args.phone,
		orderId: args.orderId,
		kind: "order_shipped",
		body:
			text(s.template_order_shipped)
				?.split("{{order}}")
				.join(args.orderNumber)
				.split("{{tracking}}")
				.join(args.tracking ?? "")
				.split("{{store}}")
				.join(name) ||
			`Your order ${args.orderNumber} is on its way${args.tracking ? `. Tracking: ${args.tracking}` : ""}. — ${name}`,
	})
}
