/**
 * Orders: creation, status transitions, numbering and reporting.
 *
 * Two rules run through this whole file.
 *
 * 1. The browser never states a price. Every amount is recalculated here from
 *    the products table, so a tampered basket cannot buy a sofa for 1p.
 * 2. All *_minor columns are integers in the STORE'S BASE currency. The
 *    shopper's currency is recorded separately (`currency` + `fx_rate`) so
 *    reports stay comparable no matter what anyone paid in.
 */
import { query, one, tx } from "./db.js"
import { getSettings, getNamespace } from "./settings.js"
import { getRate, applyRounding } from "./fx.js"

/* ------------------------------------------------------------------ *
 * Vocabulary
 * ------------------------------------------------------------------ */

export const ORDER_STATUSES = [
	"pending",
	"confirmed",
	"processing",
	"ready_to_ship",
	"shipped",
	"out_for_delivery",
	"delivered",
	"completed",
	"on_hold",
	"cancelled",
	"failed",
	"returned",
] as const

export const PAYMENT_STATUSES = [
	"unpaid",
	"pending",
	"authorized",
	"paid",
	"partially_paid",
	"partially_refunded",
	"refunded",
	"failed",
	"voided",
] as const

export const FULFILLMENT_STATUSES = [
	"unfulfilled",
	"partially_fulfilled",
	"fulfilled",
	"returned",
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number]

/** Fields an admin is allowed to change directly, and their vocabularies. */
const EDITABLE_FIELDS: Record<string, readonly string[] | null> = {
	status: ORDER_STATUSES,
	payment_status: PAYMENT_STATUSES,
	fulfillment_status: FULFILLMENT_STATUSES,
	tracking_number: null,
	tracking_url: null,
	courier: null,
	staff_note: null,
	cancelled_reason: null,
	shipping_method: null,
}

/* ------------------------------------------------------------------ *
 * Order numbering — admin controlled
 * ------------------------------------------------------------------ */

type NumberSettings = {
	number_prefix?: unknown
	number_suffix?: unknown
	number_padding?: unknown
	number_start?: unknown
	include_year?: unknown
}

function formatOrderNumber(seq: number, s: NumberSettings): string {
	const prefix = typeof s.number_prefix === "string" ? s.number_prefix : "ORD-"
	const suffix = typeof s.number_suffix === "string" ? s.number_suffix : ""
	const padRaw = Number(s.number_padding ?? 5)
	const pad = Number.isFinite(padRaw) ? Math.min(Math.max(Math.trunc(padRaw), 1), 12) : 5
	const year = s.include_year === true ? `${new Date().getFullYear()}-` : ""
	return `${prefix}${year}${String(seq).padStart(pad, "0")}${suffix}`
}

/**
 * Live preview for the admin panel's numbering fields, so an admin can see the
 * shape of the next number before saving.
 */
export function previewOrderNumber(patch: Record<string, unknown>): string {
	const startRaw = Number(patch.number_start ?? 1)
	const start = Number.isFinite(startRaw) ? Math.max(Math.trunc(startRaw), 1) : 1
	return formatOrderNumber(start, patch as NumberSettings)
}

/**
 * Claim the next order number. The sequence is a Postgres object, so two
 * simultaneous checkouts can never be handed the same number.
 */
async function nextOrderNumber(): Promise<string> {
	const s = await getNamespace<NumberSettings & { number_start?: unknown }>("orders")
	const row = await one<{ n: number }>(`select nextval('order_number_seq') as n`)
	const seqRaw = Number(row?.n ?? 1)
	const startRaw = Number(s.number_start ?? 1)
	const start = Number.isFinite(startRaw) ? Math.max(Math.trunc(startRaw) - 1, 0) : 0
	return formatOrderNumber(start + seqRaw, s)
}

/* ------------------------------------------------------------------ *
 * Order creation
 * ------------------------------------------------------------------ */

export type CreateOrderItem = {
	productId: string
	variantId?: string | null
	qty: number
}

export type CreateOrderArgs = {
	email: string
	phone?: string | null
	items: CreateOrderItem[]
	shippingAddress?: Record<string, unknown> | null
	billingAddress?: Record<string, unknown> | null
	couponCode?: string | null
	paymentMethod?: string | null
	shippingMethod?: string | null
	customerNote?: string | null
	displayCurrency?: string | null
	country?: string | null
}

export type CreateOrderResult =
	| { ok: true; orderId: string; number: string; totalMinor: number; currency: string }
	| { ok: false; error: string }

type PricedLine = {
	productId: string
	variantId: string | null
	title: string
	variantTitle: string | null
	sku: string | null
	imageUrl: string | null
	qty: number
	unitMinor: number
	totalMinor: number
	trackStock: boolean
	taxClass: string
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)

/**
 * Create an order from a basket.
 *
 * Nothing here trusts the request body beyond product ids and quantities.
 * Prices, discounts, shipping and tax are all recalculated, stock is checked
 * and decremented inside one transaction, and the order number is claimed from
 * a sequence — so a double-submitted checkout cannot reuse a number.
 */
export async function createOrder(args: CreateOrderArgs): Promise<CreateOrderResult> {
	const email = String(args.email ?? "").trim().toLowerCase()
	if (!isEmail(email)) return { ok: false, error: "Please enter a valid email address." }

	const wanted = (args.items ?? [])
		.map((i) => ({
			productId: String(i.productId ?? ""),
			variantId: i.variantId ? String(i.variantId) : null,
			qty: Math.trunc(Number(i.qty ?? 1)),
		}))
		.filter((i) => i.productId && i.qty > 0)

	if (!wanted.length) return { ok: false, error: "Your basket is empty." }
	if (wanted.some((i) => i.qty > 999)) {
		return { ok: false, error: "That quantity is not available. Please contact us for bulk orders." }
	}

	const settings = await getSettings()
	const currencySettings = (settings.currency ?? {}) as Record<string, unknown>
	const shippingSettings = (settings.shipping ?? {}) as Record<string, unknown>
	const taxSettings = (settings.tax ?? {}) as Record<string, unknown>
	const orderSettings = (settings.orders ?? {}) as Record<string, unknown>

	const base = String(currencySettings.base ?? "GBP").toUpperCase()

	/* ---- price every line from the database, never from the request ---- */
	const lines: PricedLine[] = []
	for (const item of wanted) {
		const product = await one<{
			id: string
			title: string
			status: string
			price_minor: number
			sku: string | null
			track_stock: boolean
			stock: number
			tax_class: string
		}>(
			`select id, title, status, price_minor, sku, track_stock, stock, tax_class
			   from products where id = $1`,
			[item.productId],
		)
		if (!product || product.status !== "active") {
			return { ok: false, error: "One of the items is no longer available." }
		}

		let unitMinor = Number(product.price_minor ?? 0)
		let variantTitle: string | null = null
		let sku = product.sku
		let stock = Number(product.stock ?? 0)

		if (item.variantId) {
			const variant = await one<{
				id: string
				title: string
				sku: string | null
				price_minor: number | null
				stock: number
			}>(
				`select id, title, sku, price_minor, stock
				   from product_variants where id = $1 and product_id = $2`,
				[item.variantId, product.id],
			)
			if (!variant) return { ok: false, error: "That option is no longer available." }
			variantTitle = variant.title
			if (variant.sku) sku = variant.sku
			if (variant.price_minor !== null && variant.price_minor !== undefined) {
				unitMinor = Number(variant.price_minor)
			}
			stock = Number(variant.stock ?? 0)
		}

		if (product.track_stock && stock < item.qty) {
			return {
				ok: false,
				error:
					stock <= 0
						? `${product.title} has just sold out.`
						: `Only ${stock} left of ${product.title}.`,
			}
		}
		if (!Number.isFinite(unitMinor) || unitMinor < 0) {
			return { ok: false, error: "That item is not priced correctly. Please contact us." }
		}

		const image = await one<{ url: string }>(
			`select url from product_images where product_id = $1 order by position asc limit 1`,
			[product.id],
		)

		lines.push({
			productId: product.id,
			variantId: item.variantId,
			title: product.title,
			variantTitle,
			sku,
			imageUrl: image?.url ?? null,
			qty: item.qty,
			unitMinor,
			totalMinor: unitMinor * item.qty,
			trackStock: product.track_stock === true,
			taxClass: String(product.tax_class ?? "standard"),
		})
	}

	const subtotalMinor = lines.reduce((sum, l) => sum + l.totalMinor, 0)

	/* ---- discount ---- */
	let discountMinor = 0
	let freeShipping = false
	let couponCode: string | null = null

	const rawCoupon = String(args.couponCode ?? "").trim()
	if (rawCoupon) {
		const coupon = await one<{
			id: string
			code: string
			type: string
			value: number
			min_spend_minor: number
			usage_limit: number | null
			used_count: number
			active: boolean
			starts_at: string | null
			ends_at: string | null
		}>(
			`select id, code, type, value, min_spend_minor, usage_limit, used_count,
			        active, starts_at, ends_at
			   from coupons where upper(code) = upper($1)`,
			[rawCoupon],
		)

		const now = Date.now()
		const startsOk = !coupon?.starts_at || new Date(coupon.starts_at).getTime() <= now
		const endsOk = !coupon?.ends_at || new Date(coupon.ends_at).getTime() >= now
		const usageOk =
			!coupon?.usage_limit || Number(coupon.used_count ?? 0) < Number(coupon.usage_limit)

		if (!coupon || coupon.active !== true || !startsOk || !endsOk || !usageOk) {
			return { ok: false, error: "That discount code is not valid." }
		}
		if (subtotalMinor < Number(coupon.min_spend_minor ?? 0)) {
			return { ok: false, error: "Your basket does not meet this code's minimum spend." }
		}

		couponCode = coupon.code
		if (coupon.type === "percent") {
			discountMinor = Math.round((subtotalMinor * Number(coupon.value ?? 0)) / 100)
		} else if (coupon.type === "fixed") {
			// `value` is a decimal amount, e.g. 5.00 -> 500 minor units.
			discountMinor = Math.round(Number(coupon.value ?? 0) * 100)
		} else if (coupon.type === "free_shipping") {
			freeShipping = true
		}
		// A discount can never exceed the basket, or we would owe the customer money.
		discountMinor = Math.min(Math.max(discountMinor, 0), subtotalMinor)
	}

	/* ---- shipping ---- */
	let shippingMinor = 0
	if (shippingSettings.enabled !== false && !freeShipping) {
		const flat = Number(shippingSettings.flat_rate_minor ?? 0)
		const freeOver = Number(shippingSettings.free_over_minor ?? 0)
		const afterDiscount = subtotalMinor - discountMinor
		const qualifiesFree = freeOver > 0 && afterDiscount >= freeOver
		shippingMinor = qualifiesFree ? 0 : Math.max(0, Math.trunc(flat))
		if (args.shippingMethod === "local_pickup" && shippingSettings.local_pickup === true) {
			shippingMinor = 0
		}
	}

	/* ---- tax ---- */
	let taxMinor = 0
	if (taxSettings.enabled === true) {
		const percent = Number(
			(taxSettings.rate_percent as number | undefined) ??
				(taxSettings.default_rate as number | undefined) ??
				(taxSettings.rate as number | undefined) ??
				0,
		)
		if (Number.isFinite(percent) && percent > 0) {
			const taxable = subtotalMinor - discountMinor + shippingMinor
			taxMinor =
				taxSettings.prices_include_tax === true
					? // Prices already contain tax: report the portion, do not add to it.
						Math.round(taxable - taxable / (1 + percent / 100))
					: Math.round((taxable * percent) / 100)
		}
	}

	const totalMinor =
		taxSettings.prices_include_tax === true
			? subtotalMinor - discountMinor + shippingMinor
			: subtotalMinor - discountMinor + shippingMinor + taxMinor

	if (totalMinor < 0) return { ok: false, error: "We could not total that basket." }

	/* ---- what the shopper actually sees ---- */
	const display = String(args.displayCurrency ?? base).toUpperCase()
	let fxRate = 1
	if (display !== base) {
		try {
			fxRate = await getRate(base, display)
		} catch {
			fxRate = 1
		}
		if (!Number.isFinite(fxRate) || fxRate <= 0) fxRate = 1
	}
	const rounding = String(currencySettings.rounding ?? "none")
	if (rounding !== "none") {
		// Only presentation is rounded; the base-currency figures stay exact.
		applyRounding(totalMinor * fxRate, rounding)
	}

	const number = await nextOrderNumber()
	const autoConfirm = orderSettings.auto_confirm_paid === true
	const paymentMethod = String(args.paymentMethod ?? "cod")

	try {
		const orderId = await tx(async (client) => {
			/* Attach to an existing customer record, or create a light one. */
			const existing = await client.query<{ id: string }>(
				`select id from customers where email = $1`,
				[email],
			)
			let customerId = existing.rows[0]?.id ?? null
			if (!customerId) {
				const created = await client.query<{ id: string }>(
					`insert into customers (email, name, phone)
					 values ($1, $2, $3)
					 on conflict (email) do update set phone = coalesce(customers.phone, excluded.phone)
					 returning id`,
					[
						email,
						String(
							(args.shippingAddress?.name as string | undefined) ??
								(args.billingAddress?.name as string | undefined) ??
								"",
						),
						args.phone ? String(args.phone) : null,
					],
				)
				customerId = created.rows[0]?.id ?? null
			}

			const inserted = await client.query<{ id: string }>(
				`insert into orders (
				   number, customer_id, email, phone, status, payment_status, fulfillment_status,
				   currency, fx_rate, subtotal_minor, discount_minor, shipping_minor, tax_minor,
				   total_minor, coupon_code, payment_method, shipping_address, billing_address,
				   shipping_method, customer_note
				 ) values (
				   $1,$2,$3,$4,'pending','unpaid','unfulfilled',
				   $5,$6,$7,$8,$9,$10,
				   $11,$12,$13,$14::jsonb,$15::jsonb,
				   $16,$17
				 ) returning id`,
				[
					number,
					customerId,
					email,
					args.phone ? String(args.phone) : null,
					display,
					fxRate,
					subtotalMinor,
					discountMinor,
					shippingMinor,
					taxMinor,
					totalMinor,
					couponCode,
					paymentMethod,
					JSON.stringify(args.shippingAddress ?? null),
					JSON.stringify(args.billingAddress ?? null),
					args.shippingMethod ? String(args.shippingMethod) : null,
					args.customerNote ? String(args.customerNote) : null,
				],
			)
			const newId = inserted.rows[0]?.id
			if (!newId) throw new Error("Order insert returned no id")

			for (const l of lines) {
				await client.query(
					`insert into order_items (
					   order_id, product_id, variant_id, title, variant_title, sku, image_url,
					   qty, unit_price_minor, total_minor
					 ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
					[
						newId,
						l.productId,
						l.variantId,
						l.title,
						l.variantTitle,
						l.sku,
						l.imageUrl,
						l.qty,
						l.unitMinor,
						l.totalMinor,
					],
				)

				/* Decrement stock with a guard in the WHERE clause: if someone else
				 * bought the last one microseconds ago, this updates zero rows and we
				 * abandon the whole transaction rather than oversell. */
				if (l.trackStock) {
					if (l.variantId) {
						const r = await client.query(
							`update product_variants set stock = stock - $2
							  where id = $1 and stock >= $2`,
							[l.variantId, l.qty],
						)
						if (r.rowCount === 0) throw new Error(`SOLD_OUT:${l.title}`)
					}
					const r = await client.query(
						`update products set stock = stock - $2, updated_at = now()
						  where id = $1 and stock >= $2`,
						[l.productId, l.qty],
					)
					if (r.rowCount === 0) throw new Error(`SOLD_OUT:${l.title}`)
				}
			}

			if (couponCode) {
				await client.query(
					`update coupons set used_count = used_count + 1 where upper(code) = upper($1)`,
					[couponCode],
				)
				await client
					.query(
						`insert into coupon_redemptions (coupon_code, order_id, email)
						 values ($1,$2,$3)`,
						[couponCode, newId, email],
					)
					.catch(() => {
						/* the counter above is the source of truth; the log is a nicety */
					})
			}

			await client.query(
				`insert into order_status_history (order_id, field, from_value, to_value, note, actor)
				 values ($1,'status',null,'pending',$2,'customer')`,
				[newId, `Placed via ${paymentMethod}`],
			)

			// Offline methods have nothing to confirm, so the order can move on.
			if (autoConfirm && (paymentMethod === "cod" || paymentMethod === "manual")) {
				await client.query(
					`update orders set status = 'confirmed', updated_at = now() where id = $1`,
					[newId],
				)
			}

			return newId
		})

		return { ok: true, orderId, number, totalMinor, currency: display }
	} catch (err) {
		const message = (err as Error).message ?? ""
		if (message.startsWith("SOLD_OUT:")) {
			return {
				ok: false,
				error: `${message.slice(9)} sold out while you were checking out. Nothing has been charged.`,
			}
		}
		console.error("[orders] createOrder failed", message)
		return { ok: false, error: "We could not place that order. Please try again." }
	}
}

/* ------------------------------------------------------------------ *
 * Status changes
 * ------------------------------------------------------------------ */

export type UpdateFieldResult = { ok: true } | { ok: false; error: string }

/**
 * Change one field on an order and record who did it.
 *
 * Every change is appended to order_status_history, so the order timeline in
 * the admin panel and the customer's tracking page are the same story.
 */
export async function updateOrderField(
	orderId: string,
	field: string,
	value: string,
	actor: string,
	note?: string,
): Promise<UpdateFieldResult> {
	if (!(field in EDITABLE_FIELDS)) {
		return { ok: false, error: `"${field}" is not an editable order field.` }
	}
	const vocabulary = EDITABLE_FIELDS[field]
	if (vocabulary && !vocabulary.includes(value)) {
		return { ok: false, error: `"${value}" is not a valid ${field.replace(/_/g, " ")}.` }
	}

	const current = await one<Record<string, unknown>>(
		`select id, status, payment_status, fulfillment_status, tracking_number,
		        tracking_url, courier, staff_note, cancelled_reason, shipping_method
		   from orders where id = $1`,
		[orderId],
	)
	if (!current) return { ok: false, error: "Order not found." }

	const before = current[field] === null || current[field] === undefined ? null : String(current[field])
	const after = value === "" ? null : value
	if (before === after) return { ok: true }

	// Field name is whitelisted above, so this interpolation cannot be injected.
	await query(`update orders set ${field} = $2, updated_at = now() where id = $1`, [
		orderId,
		after,
	])

	await query(
		`insert into order_status_history (order_id, field, from_value, to_value, note, actor)
		 values ($1,$2,$3,$4,$5,$6)`,
		[orderId, field, before, after, note ?? null, actor],
	)

	/* Keep the obvious companions in step so staff cannot leave a contradiction. */
	if (field === "status" && (value === "delivered" || value === "completed")) {
		await query(
			`update orders set fulfillment_status = 'fulfilled', updated_at = now()
			  where id = $1 and fulfillment_status <> 'returned'`,
			[orderId],
		)
	}
	if (field === "status" && value === "shipped") {
		await query(
			`update orders set fulfillment_status = 'fulfilled', updated_at = now()
			  where id = $1 and fulfillment_status = 'unfulfilled'`,
			[orderId],
		)
	}

	return { ok: true }
}

/* ------------------------------------------------------------------ *
 * Reporting — the dashboard charts
 * ------------------------------------------------------------------ */

/**
 * Only money that actually arrived is counted as revenue: an unpaid pending
 * order is not a sale, so a fresh store correctly shows zero rather than
 * flattering numbers.
 */
const PAID_CLAUSE = `payment_status in ('paid','partially_refunded')`

export type DashboardSummary = {
	revenue_this_month: number
	revenue_last_month: number
	revenue_today: number
	revenue_all_time: number
	orders_this_month: number
	orders_today: number
	orders_pending: number
	orders_unfulfilled: number
	average_order_minor: number
	customers_total: number
	products_active: number
	low_stock_count: number
}

export async function dashboardSummary(): Promise<DashboardSummary> {
	const row = await one<Record<string, unknown>>(
		`select
		   coalesce(sum(total_minor) filter (where ${PAID_CLAUSE}
		     and placed_at >= date_trunc('month', now())), 0)                        as revenue_this_month,
		   coalesce(sum(total_minor) filter (where ${PAID_CLAUSE}
		     and placed_at >= date_trunc('month', now()) - interval '1 month'
		     and placed_at <  date_trunc('month', now())), 0)                        as revenue_last_month,
		   coalesce(sum(total_minor) filter (where ${PAID_CLAUSE}
		     and placed_at >= date_trunc('day', now())), 0)                          as revenue_today,
		   coalesce(sum(total_minor) filter (where ${PAID_CLAUSE}), 0)               as revenue_all_time,
		   count(*) filter (where placed_at >= date_trunc('month', now()))          as orders_this_month,
		   count(*) filter (where placed_at >= date_trunc('day', now()))            as orders_today,
		   count(*) filter (where status = 'pending')                               as orders_pending,
		   count(*) filter (where fulfillment_status = 'unfulfilled'
		     and status not in ('cancelled','failed'))                              as orders_unfulfilled,
		   coalesce(avg(total_minor) filter (where ${PAID_CLAUSE}), 0)              as average_order_minor
		 from orders`,
	)

	const extra = await one<Record<string, unknown>>(
		`select
		   (select count(*) from customers)                                          as customers_total,
		   (select count(*) from products where status = 'active')                    as products_active,
		   (select count(*) from products
		      where track_stock and stock <= low_stock_at and status = 'active')      as low_stock_count`,
	)

	const n = (v: unknown) => {
		const num = Number(v ?? 0)
		return Number.isFinite(num) ? Math.round(num) : 0
	}

	return {
		revenue_this_month: n(row?.revenue_this_month),
		revenue_last_month: n(row?.revenue_last_month),
		revenue_today: n(row?.revenue_today),
		revenue_all_time: n(row?.revenue_all_time),
		orders_this_month: n(row?.orders_this_month),
		orders_today: n(row?.orders_today),
		orders_pending: n(row?.orders_pending),
		orders_unfulfilled: n(row?.orders_unfulfilled),
		average_order_minor: n(row?.average_order_minor),
		customers_total: n(extra?.customers_total),
		products_active: n(extra?.products_active),
		low_stock_count: n(extra?.low_stock_count),
	}
}

export type RevenuePoint = {
	bucket: string
	revenue_minor: number
	orders: number
}

/**
 * Revenue over time for the dashboard chart.
 *
 * Buckets are generated by Postgres, so a day with no sales appears as a zero
 * rather than vanishing and making the line lie about the shape of the month.
 */
export async function revenueSeries(
	granularity: string = "day",
	days: number = 30,
): Promise<RevenuePoint[]> {
	const unit = granularity === "month" ? "month" : granularity === "week" ? "week" : "day"
	const windowDaysRaw = Number(days)
	const windowDays = Number.isFinite(windowDaysRaw)
		? Math.min(Math.max(Math.trunc(windowDaysRaw), 1), 730)
		: 30

	const rows = await query<{ bucket: string; revenue_minor: number; orders: number }>(
		`with span as (
		   select generate_series(
		     date_trunc($1, now() - ($2 || ' days')::interval),
		     date_trunc($1, now()),
		     ('1 ' || $1)::interval
		   ) as bucket
		 )
		 select to_char(span.bucket, 'YYYY-MM-DD')                     as bucket,
		        coalesce(sum(o.total_minor), 0)                        as revenue_minor,
		        count(o.id)                                           as orders
		   from span
		   left join orders o
		     on date_trunc($1, o.placed_at) = span.bucket
		    and o.${PAID_CLAUSE}
		  group by span.bucket
		  order by span.bucket`,
		[unit, windowDays],
	)

	return rows.map((r) => ({
		bucket: String(r.bucket),
		revenue_minor: Number(r.revenue_minor ?? 0),
		orders: Number(r.orders ?? 0),
	}))
}

export type TopProduct = {
	product_id: string | null
	title: string
	units: number
	revenue_minor: number
}

export async function topProducts(limit = 10): Promise<TopProduct[]> {
	const capped = Math.min(Math.max(Math.trunc(Number(limit) || 10), 1), 100)
	const rows = await query<{
		product_id: string | null
		title: string
		units: number
		revenue_minor: number
	}>(
		`select oi.product_id,
		        max(oi.title)                as title,
		        coalesce(sum(oi.qty), 0)     as units,
		        coalesce(sum(oi.total_minor), 0) as revenue_minor
		   from order_items oi
		   join orders o on o.id = oi.order_id
		  where o.${PAID_CLAUSE}
		  group by oi.product_id
		  order by revenue_minor desc
		  limit $1`,
		[capped],
	)

	return rows.map((r) => ({
		product_id: r.product_id ?? null,
		title: String(r.title ?? "Unknown product"),
		units: Number(r.units ?? 0),
		revenue_minor: Number(r.revenue_minor ?? 0),
	}))
}
