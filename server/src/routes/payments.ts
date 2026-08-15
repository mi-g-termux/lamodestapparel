/**
 * Payment routes: start a payment, handle the shopper coming back, and receive
 * gateway webhooks.
 *
 * Two rules run through this file:
 *   1. The browser never tells us an amount. Every figure is re-read from the
 *      order row in Postgres.
 *   2. An order is only marked paid by code that has verified the money with the
 *      gateway — either a signed webhook or a server-to-server capture.
 */
import { Router, type Request, type Response } from "express"
import crypto from "node:crypto"
import { query, one, tx } from "../db.js"
import { env } from "../env.js"
import { rateLimit, clientIp } from "../security.js"
import { getSettings } from "../settings.js"
import { notifyOrderPlaced, notifyOrderStatus } from "../notifications.js"
import { ensureInvoice } from "../invoice.js"
import {
	availableMethods,
	methodIsAllowed,
	offlineInstructions,
	stripeConfig,
	paypalConfig,
	stripe,
	paypal,
	PaymentError,
	type ProviderId,
} from "../payments/index.js"

export const paymentsRouter = Router()

const siteUrl = () => env.SITE_URL.replace(/\/+$/, "")

type OrderRow = {
	id: string
	order_number: string
	email: string | null
	currency: string
	presentment_currency: string | null
	total_minor: number
	subtotal_minor: number
	shipping_minor: number
	tax_minor: number
	discount_minor: number
	status: string
	payment_status: string
	payment_method: string | null
	payment_reference: string | null
	capture_reference: string | null
}

async function loadOrder(id: string): Promise<OrderRow | null> {
	return one<OrderRow>(
		`select id, number as order_number, email, currency, presentment_currency,
		        total_minor, subtotal_minor, shipping_minor, tax_minor, discount_minor,
		        status, payment_status, payment_method, payment_reference, capture_reference
		   from orders where id = $1`,
		[id],
	)
}

type OrderLine = {
	title: string
	sku: string | null
	quantity: number
	unit_price_minor: number
}

async function orderLines(orderId: string): Promise<OrderLine[]> {
	// The column is `qty`; it is aliased so the gateway builders can stay in the
	// vocabulary Stripe and PayPal use.
	return await query<OrderLine>(
		`select title, sku, qty as quantity, unit_price_minor
		   from order_items where order_id = $1 order by id asc`,
		[orderId],
	)
}

async function storeName(): Promise<string> {
	const s: any = await getSettings()
	return (
		s?.branding?.store_name ??
		s?.store_profile?.store_name ??
		"Online store"
	)
}

/**
 * A short signed token so the return URL cannot be used to poke at other
 * people's orders. It proves "this browser started this payment", nothing more.
 */
function signOrderToken(orderId: string): string {
	const exp = Date.now() + 6 * 60 * 60 * 1000
	const mac = crypto
		.createHmac("sha256", env.APP_SECRET)
		.update(`pay:${orderId}:${exp}`)
		.digest("base64url")
		.slice(0, 32)
	return `${exp}.${mac}`
}

function verifyOrderToken(orderId: string, token: unknown): boolean {
	if (typeof token !== "string" || !token.includes(".")) return false
	const [expRaw, mac] = token.split(".")
	const exp = Number(expRaw)
	if (!Number.isFinite(exp) || exp < Date.now()) return false
	const expected = crypto
		.createHmac("sha256", env.APP_SECRET)
		.update(`pay:${orderId}:${exp}`)
		.digest("base64url")
		.slice(0, 32)
	const a = Buffer.from(mac ?? "", "utf8")
	const b = Buffer.from(expected, "utf8")
	return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Which methods the checkout page may show. */
paymentsRouter.get("/methods", async (_req, res) => {
	const methods = await availableMethods()
	res.json({
		methods: methods.map(({ id, label, description, flow }) => ({
			id,
			label,
			description,
			flow,
		})),
	})
})

/**
 * Begin payment for an order that checkout has already created.
 * POST /api/public/payments/start { orderId, method }
 */
paymentsRouter.post("/start", async (req: Request, res: Response) => {
	// 20 attempts per IP per five minutes: room for a fumbled card, not enough
	// to use our checkout as a stolen-card testing machine. The limiter sends its
	// own 429, so if it did not call next() we simply stop here.
	let withinLimit = false
	await rateLimit("pay_start", 20, 300)(req, res, () => {
		withinLimit = true
	})
	if (!withinLimit) return

	const orderId = String((req.body as any)?.orderId ?? "")
	const method = String((req.body as any)?.method ?? "") as ProviderId
	if (!orderId || !method) {
		return res.status(400).json({ error: "Missing order or payment method." })
	}
	if (!(await methodIsAllowed(method))) {
		return res
			.status(400)
			.json({ error: "That payment method is not available." })
	}

	const order = await loadOrder(orderId)
	if (!order) return res.status(404).json({ error: "Order not found." })
	if (order.payment_status === "paid") {
		return res.json({ alreadyPaid: true, orderNumber: order.order_number })
	}
	if (["cancelled", "failed"].includes(order.status)) {
		return res
			.status(409)
			.json({ error: "This order can no longer be paid for." })
	}

	// The shopper pays in the currency the order was placed in.
	const currency = order.presentment_currency ?? order.currency
	const token = signOrderToken(order.id)
	const base = siteUrl()
	const name = await storeName()

	try {
		if (method === "stripe") {
			const cfg = await stripeConfig()
			if (!cfg) throw new PaymentError("Stripe is not configured.")
			const lines = await orderLines(order.id)
			const session = await stripe.createCheckoutSession(cfg, {
				orderId: order.id,
				orderNumber: order.order_number,
				currency,
				lines: lines.map((l) => ({
					name: l.title,
					amountMinor: l.unit_price_minor,
					quantity: l.quantity,
				})),
				shippingMinor: order.shipping_minor,
				taxMinor: order.tax_minor,
				discountMinor: order.discount_minor,
				customerEmail: order.email ?? undefined,
				successUrl: `${base}/payment/return?order=${order.id}&t=${token}&provider=stripe&session={CHECKOUT_SESSION_ID}`,
				cancelUrl: `${base}/payment/cancelled?order=${order.id}&t=${token}`,
				storeName: name,
			})

			await query(
				`update orders set payment_method = $2, payment_reference = $3,
				        payment_status = case when payment_status = 'unpaid' then 'pending' else payment_status end,
				        updated_at = now()
				  where id = $1`,
				[order.id, "stripe", session.id],
			)
			await query(
				`insert into payments (order_id, provider, provider_reference, amount_minor, currency, status)
				 values ($1,$2,$3,$4,$5,'pending')
				 on conflict do nothing`,
				[order.id, "stripe", session.id, order.total_minor, currency],
			)

			return res.json({
				flow: "redirect",
				provider: "stripe",
				url: session.url,
			})
		}

		if (method === "paypal") {
			const cfg = await paypalConfig()
			if (!cfg) throw new PaymentError("PayPal is not configured.")
			const lines = await orderLines(order.id)
			const created = await paypal.createOrder(cfg, {
				orderId: order.id,
				orderNumber: order.order_number,
				currency,
				lines: lines.map((l) => ({
					name: l.title,
					sku: l.sku ?? undefined,
					amountMinor: l.unit_price_minor,
					quantity: l.quantity,
				})),
				itemsSubtotalMinor: order.subtotal_minor,
				shippingMinor: order.shipping_minor,
				taxMinor: order.tax_minor,
				discountMinor: order.discount_minor,
				totalMinor: order.total_minor,
				returnUrl: `${base}/payment/return?order=${order.id}&t=${token}&provider=paypal`,
				cancelUrl: `${base}/payment/cancelled?order=${order.id}&t=${token}`,
				storeName: name,
				customerEmail: order.email ?? undefined,
			})

			await query(
				`update orders set payment_method = $2, payment_reference = $3,
				        payment_status = case when payment_status = 'unpaid' then 'pending' else payment_status end,
				        updated_at = now()
				  where id = $1`,
				[order.id, "paypal", created.id],
			)
			await query(
				`insert into payments (order_id, provider, provider_reference, amount_minor, currency, status)
				 values ($1,$2,$3,$4,$5,'pending')
				 on conflict do nothing`,
				[order.id, "paypal", created.id, order.total_minor, currency],
			)

			return res.json({
				flow: "redirect",
				provider: "paypal",
				url: created.approveUrl,
			})
		}

		// Offline methods: nothing to call, just record the choice.
		await query(
			`update orders set payment_method = $2, payment_status = 'unpaid', updated_at = now()
			  where id = $1`,
			[order.id, method],
		)
		return res.json({
			flow: "offline",
			provider: method,
			instructions: await offlineInstructions(method),
			orderNumber: order.order_number,
		})
	} catch (err: any) {
		console.error("[payments] start failed", err?.message)
		return res.status(502).json({
			error:
				err instanceof PaymentError || err?.name?.includes("Error")
					? err.message
					: "We could not start the payment. Please try again.",
		})
	}
})

/**
 * Mark an order paid exactly once, then fire notifications and the invoice.
 * Safe to call from both the return URL and the webhook — whichever arrives
 * first wins and the other becomes a no-op.
 */
async function markPaid(args: {
	orderId: string
	provider: string
	reference: string
	captureReference?: string
	paidMinor: number
	currency: string
}): Promise<{ changed: boolean; order?: OrderRow; mismatch?: boolean }> {
	return tx(async (client) => {
		// Lock the row so two concurrent confirmations cannot both proceed.
		const { rows } = await client.query<OrderRow>(
			`select id, number as order_number, email, currency, presentment_currency,
			        total_minor, subtotal_minor, shipping_minor, tax_minor, discount_minor,
			        status, payment_status, payment_method, payment_reference, capture_reference
			   from orders where id = $1 for update`,
			[args.orderId],
		)
		const order = rows[0]
		if (!order) return { changed: false }
		if (order.payment_status === "paid") return { changed: false, order }

		// Underpayment is never treated as paid. Flag it for a human instead.
		const mismatch = args.paidMinor > 0 && args.paidMinor < order.total_minor
		if (mismatch) {
			await client.query(
				`update orders set payment_status = 'partially_paid', status = 'on_hold',
				        payment_reference = $2, updated_at = now()
				  where id = $1`,
				[order.id, args.reference],
			)
			await client.query(
				`insert into order_status_history (order_id, field, from_value, to_value, note, actor)
				 values ($1,'payment_status',$2,'partially_paid',$3,'system')`,
				[
					order.id,
					order.payment_status,
					`Gateway reported ${args.paidMinor} but the order total is ${order.total_minor}. Held for review.`,
				],
			)
			return { changed: true, order, mismatch: true }
		}

		await client.query(
			`update orders
			    set payment_status = 'paid',
			        status = case when status in ('pending','on_hold') then 'confirmed' else status end,
			        payment_method = $2,
			        payment_reference = $3,
			        capture_reference = coalesce($4, capture_reference),
			        paid_at = now(),
			        updated_at = now()
			  where id = $1`,
			[order.id, args.provider, args.reference, args.captureReference ?? null],
		)

		await client.query(
			`insert into payments (order_id, provider, provider_reference, amount_minor, currency, status, captured_at)
			 values ($1,$2,$3,$4,$5,'succeeded', now())
			 on conflict (provider, provider_reference)
			 do update set status = 'succeeded', captured_at = now(), amount_minor = excluded.amount_minor`,
			[
				order.id,
				args.provider,
				args.reference,
				args.paidMinor || order.total_minor,
				args.currency || order.currency,
			],
		)

		await client.query(
			`insert into order_status_history (order_id, field, from_value, to_value, note, actor)
			 values ($1,'payment_status',$2,'paid',$3,'system')`,
			[
				order.id,
				order.payment_status,
				`Confirmed by ${args.provider} (${args.reference}).`,
			],
		)

		return { changed: true, order }
	})
}

/** Side effects that must not run inside the database transaction. */
async function afterPaid(orderId: string, orderNumber: string) {
	// Never let a mail or PDF problem break the shopper's return journey.
	try {
		await ensureInvoice(orderId)
	} catch (err: any) {
		console.error("[payments] invoice failed", err?.message)
	}
	try {
		// The notifiers want the order itself, not just its id, so that a single
		// email can show the lines without re-querying per template.
		const order = await one<{
			id: string
			number: string
			email: string
			currency: string
			total_minor: number
			fx_rate: number
			payment_method: string | null
			tracking_number: string | null
			tracking_url: string | null
			shipping_address: Record<string, unknown> | null
		}>(
			`select id, number, email, currency, total_minor, fx_rate, payment_method,
			        tracking_number, tracking_url, shipping_address
			   from orders where id = $1`,
			[orderId],
		)

		if (order) {
			const items = await query<{
				title: string
				variant_title: string | null
				qty: number
				total_minor: number
			}>(
				`select title, variant_title, qty, total_minor
				   from order_items where order_id = $1 order by id asc`,
				[orderId],
			)

			await notifyOrderPlaced({
				id: order.id,
				number: order.number,
				email: order.email,
				currency: order.currency,
				total_minor: Number(order.total_minor ?? 0),
				fx_rate: Number(order.fx_rate ?? 1),
				payment_method: order.payment_method ?? null,
				items: items.map((i) => ({
					title: i.title,
					variant_title: i.variant_title,
					qty: Number(i.qty ?? 1),
					total_minor: Number(i.total_minor ?? 0),
				})),
				shipping_address: order.shipping_address ?? null,
			})

			await notifyOrderStatus(
				{
					id: order.id,
					number: order.number,
					email: order.email,
					tracking_number: order.tracking_number,
					tracking_url: order.tracking_url,
				},
				"confirmed",
			)
		}
	} catch (err: any) {
		console.error("[payments] notify failed", err?.message)
	}
	return orderNumber
}

/**
 * The shopper's browser comes back here. We confirm with the gateway
 * server-to-server — the query string is only a hint, never proof.
 */
paymentsRouter.get("/return", async (req: Request, res: Response) => {
	const orderId = String(req.query.order ?? "")
	const provider = String(req.query.provider ?? "")
	if (!orderId || !verifyOrderToken(orderId, req.query.t)) {
		return res.status(400).json({ error: "This payment link is not valid." })
	}

	const order = await loadOrder(orderId)
	if (!order) return res.status(404).json({ error: "Order not found." })

	try {
		if (provider === "stripe") {
			const cfg = await stripeConfig()
			const sessionId = String(req.query.session ?? order.payment_reference ?? "")
			if (!cfg || !sessionId) throw new PaymentError("Missing Stripe session.")
			const session = await stripe.retrieveSession(cfg, sessionId)
			const intent =
				typeof session.payment_intent === "object"
					? session.payment_intent
					: null
			const paid =
				session.payment_status === "paid" ||
				intent?.status === "succeeded"
			if (!paid) {
				return res.json({
					status: "pending",
					orderNumber: order.order_number,
					message:
						"Your payment is still being confirmed. We will email you the moment it clears.",
				})
			}
			const currency = (session.currency ?? order.currency).toUpperCase()
			const result = await markPaid({
				orderId: order.id,
				provider: "stripe",
				reference: intent?.id ?? sessionId,
				paidMinor: stripe.fromStripeAmount(
					Number(session.amount_total ?? 0),
					currency,
				),
				currency,
			})
			if (result.mismatch) {
				return res.json({
					status: "review",
					orderNumber: order.order_number,
					message:
						"We received a payment for a different amount, so your order is being checked by our team.",
				})
			}
			if (result.changed) await afterPaid(order.id, order.order_number)
			return res.json({ status: "paid", orderNumber: order.order_number })
		}

		if (provider === "paypal") {
			const cfg = await paypalConfig()
			const paypalOrderId =
				String(req.query.token ?? "") || order.payment_reference || ""
			if (!cfg || !paypalOrderId) throw new PaymentError("Missing PayPal order.")
			const captured = await paypal.captureOrder(cfg, paypalOrderId)
			if (!/COMPLETED/i.test(captured.status)) {
				return res.json({
					status: "pending",
					orderNumber: order.order_number,
					message:
						"PayPal has not finished confirming this payment. We will email you when it clears.",
				})
			}
			const result = await markPaid({
				orderId: order.id,
				provider: "paypal",
				reference: paypalOrderId,
				captureReference: captured.captureId,
				paidMinor: captured.amountMinor,
				currency: captured.currency || order.currency,
			})
			if (result.mismatch) {
				return res.json({
					status: "review",
					orderNumber: order.order_number,
					message:
						"We received a payment for a different amount, so your order is being checked by our team.",
				})
			}
			if (result.changed) await afterPaid(order.id, order.order_number)
			return res.json({ status: "paid", orderNumber: order.order_number })
		}

		return res.status(400).json({ error: "Unknown payment provider." })
	} catch (err: any) {
		console.error("[payments] return failed", err?.message)
		return res.status(502).json({
			status: "unknown",
			orderNumber: order.order_number,
			error:
				"We could not confirm the payment just now. If money left your account, your order is safe and our team will see it.",
		})
	}
})

/** Shopper backed out. Leave the order alone so they can try again. */
paymentsRouter.get("/cancelled", async (req: Request, res: Response) => {
	const orderId = String(req.query.order ?? "")
	if (!orderId || !verifyOrderToken(orderId, req.query.t)) {
		return res.status(400).json({ error: "This payment link is not valid." })
	}
	const order = await loadOrder(orderId)
	if (!order) return res.status(404).json({ error: "Order not found." })
	return res.json({
		status: "cancelled",
		orderNumber: order.order_number,
		message: "Payment cancelled. Your basket is still here whenever you are ready.",
	})
})

/** Record a webhook delivery once, so retries do not double-process. */
async function alreadySeen(provider: string, eventId: string) {
	const rows = await query(
		`insert into webhook_events (provider, event_id, received_at)
		 values ($1,$2, now())
		 on conflict (provider, event_id) do nothing
		 returning event_id`,
		[provider, eventId],
	)
	return rows.length === 0
}

/**
 * Stripe webhook. Requires the raw body, which index.ts preserves for this path
 * only. Always answers 2xx once the signature is good, so Stripe stops
 * retrying even if our own follow-up work fails.
 */
paymentsRouter.post("/webhook/stripe", async (req: Request, res: Response) => {
	const cfg = await stripeConfig()
	if (!cfg?.webhookSecret) {
		return res.status(503).json({ error: "Stripe webhooks are not configured." })
	}
	const raw = (req as any).rawBody ?? req.body
	const verified = stripe.verifyWebhook(
		Buffer.isBuffer(raw) ? raw : String(raw),
		req.header("stripe-signature"),
		cfg.webhookSecret,
	)
	if (!verified.ok) {
		console.warn("[stripe webhook] rejected:", verified.reason)
		return res.status(400).json({ error: "Signature verification failed." })
	}

	const event = verified.event
	try {
		if (await alreadySeen("stripe", event.id)) return res.json({ received: true })

		const obj = event.data?.object ?? {}
		const orderId = obj.metadata?.order_id ?? obj.client_reference_id ?? null

		if (
			event.type === "checkout.session.completed" ||
			event.type === "checkout.session.async_payment_succeeded" ||
			event.type === "payment_intent.succeeded"
		) {
			if (orderId) {
				const currency = String(
					obj.currency ?? "",
				).toUpperCase()
				const amount = Number(obj.amount_total ?? obj.amount_received ?? 0)
				const reference =
					typeof obj.payment_intent === "string"
						? obj.payment_intent
						: (obj.id as string)
				const result = await markPaid({
					orderId,
					provider: "stripe",
					reference,
					paidMinor: stripe.fromStripeAmount(amount, currency || "USD"),
					currency,
				})
				if (result.changed && !result.mismatch && result.order) {
					await afterPaid(orderId, result.order.order_number)
				}
			}
		} else if (
			event.type === "payment_intent.payment_failed" ||
			event.type === "checkout.session.async_payment_failed"
		) {
			if (orderId) {
				await query(
					`update orders set payment_status = 'failed', updated_at = now()
					  where id = $1 and payment_status <> 'paid'`,
					[orderId],
				)
			}
		} else if (event.type === "charge.refunded") {
			const intent =
				typeof obj.payment_intent === "string" ? obj.payment_intent : null
			if (intent) {
				const fully = Number(obj.amount_refunded ?? 0) >= Number(obj.amount ?? 0)
				await query(
					`update orders
					    set payment_status = $2, updated_at = now()
					  where payment_reference = $1`,
					[intent, fully ? "refunded" : "partially_refunded"],
				)
			}
		} else if (event.type === "charge.dispute.created") {
			const intent =
				typeof obj.payment_intent === "string" ? obj.payment_intent : null
			if (intent) {
				await query(
					`update orders set status = 'on_hold', updated_at = now()
					  where payment_reference = $1`,
					[intent],
				)
			}
		}
	} catch (err: any) {
		// Signature was valid, so acknowledge; retrying would not help.
		console.error("[stripe webhook] handling failed", err?.message)
	}

	return res.json({ received: true })
})

/** PayPal webhook, verified by asking PayPal to check the signature. */
paymentsRouter.post("/webhook/paypal", async (req: Request, res: Response) => {
	const cfg = await paypalConfig()
	if (!cfg?.webhookId) {
		return res.status(503).json({ error: "PayPal webhooks are not configured." })
	}
	const raw = (req as any).rawBody
	const body = Buffer.isBuffer(raw) ? raw.toString("utf8") : JSON.stringify(req.body)
	const verified = await paypal.verifyWebhook(cfg, req.headers as any, body)
	if (!verified.ok) {
		console.warn("[paypal webhook] rejected:", verified.reason)
		return res.status(400).json({ error: "Signature verification failed." })
	}

	const event = verified.event
	try {
		if (await alreadySeen("paypal", event.id ?? paypal.eventFingerprint(body))) {
			return res.json({ received: true })
		}

		const resource = event.resource ?? {}
		const orderId =
			resource.custom_id ??
			resource.supplementary_data?.related_ids?.order_id ??
			null

		if (event.event_type === "PAYMENT.CAPTURE.COMPLETED" && orderId) {
			const currency = resource.amount?.currency_code ?? ""
			const result = await markPaid({
				orderId,
				provider: "paypal",
				reference:
					resource.supplementary_data?.related_ids?.order_id ?? resource.id,
				captureReference: resource.id,
				paidMinor: resource.amount?.value
					? paypal.fromDecimal(resource.amount.value, currency)
					: 0,
				currency,
			})
			if (result.changed && !result.mismatch && result.order) {
				await afterPaid(orderId, result.order.order_number)
			}
		} else if (
			["PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.DECLINED"].includes(
				event.event_type,
			) &&
			orderId
		) {
			await query(
				`update orders set payment_status = 'failed', updated_at = now()
				  where id = $1 and payment_status <> 'paid'`,
				[orderId],
			)
		} else if (
			["PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED"].includes(
				event.event_type,
			)
		) {
			const captureId =
				resource.links
					?.find((l: any) => l.rel === "up")
					?.href?.split("/")
					.pop() ?? null
			if (captureId) {
				await query(
					`update orders set payment_status = 'refunded', updated_at = now()
					  where capture_reference = $1`,
					[captureId],
				)
			}
		} else if (event.event_type === "CUSTOMER.DISPUTE.CREATED" && orderId) {
			await query(
				`update orders set status = 'on_hold', updated_at = now() where id = $1`,
				[orderId],
			)
		}
	} catch (err: any) {
		console.error("[paypal webhook] handling failed", err?.message)
	}

	return res.json({ received: true })
})

export default paymentsRouter
