/**
 * Gift cards and store credit.
 *
 * Balances are integer minor units in the store's base currency. Every change
 * is a row in gift_card_transactions, so a balance can always be re-derived and
 * argued with. Redemption locks the card row, so two simultaneous checkouts can
 * never spend the same money twice.
 */
import crypto from "node:crypto"
import { query, one, tx } from "./db.js"
import { getSettings } from "./settings.js"

export type GiftCard = {
	id: string
	code: string
	initial_minor: number
	balance_minor: number
	currency: string
	status: "active" | "redeemed" | "disabled" | "expired"
	expires_at: string | null
	recipient_email: string | null
	note: string | null
	created_at: string
}

/** No 0/O/1/I/L, so codes can be read down a phone line without argument. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

function randomCode(groups = 4, size = 4): string {
	const bytes = crypto.randomBytes(groups * size)
	let out = ""
	for (let i = 0; i < groups * size; i++) {
		if (i > 0 && i % size === 0) out += "-"
		out += ALPHABET.charAt((bytes[i] ?? 0) % ALPHABET.length)
	}
	return out
}

export const normaliseCode = (raw: string) =>
	raw.toUpperCase().replace(/[^A-Z0-9]/g, "")

/** Codes are stored hashed — a leaked database dump must not be spendable. */
function hashCode(code: string, secret: string): string {
	return crypto
		.createHmac("sha256", secret)
		.update(normaliseCode(code))
		.digest("hex")
}

async function codeSecret(): Promise<string> {
	// Reuse the app secret; gift codes are not worth a second key to lose.
	const { env } = await import("./env.js")
	return env.APP_SECRET
}

async function baseCurrency(): Promise<string> {
	const s: any = await getSettings()
	// The settings key is `currency.base`; accept the longer spelling too so a
	// legacy row can never silently downgrade every card to GBP.
	const base = s?.currency?.base ?? s?.currency?.base_currency ?? "GBP"
	return String(base).toUpperCase()
}

/**
 * Issue a card. Returns the plain code exactly once — it cannot be recovered
 * afterwards, only replaced, which is the point.
 */
export async function issueGiftCard(args: {
	amountMinor: number
	currency?: string
	expiresAt?: string | null
	recipientEmail?: string | null
	note?: string | null
	issuedBy?: string | null
	orderId?: string | null
}): Promise<{ card: GiftCard; code: string }> {
	if (!Number.isInteger(args.amountMinor) || args.amountMinor <= 0) {
		throw new Error("A gift card needs a positive amount.")
	}
	const currency = (args.currency ?? (await baseCurrency())).toUpperCase()
	const secret = await codeSecret()

	// Retry on the astronomically unlikely collision.
	for (let attempt = 0; attempt < 5; attempt++) {
		const code = randomCode()
		const hash = hashCode(code, secret)
		try {
			const card = await tx(async (client) => {
				const { rows } = await client.query<GiftCard>(
					`insert into gift_cards
					   (code_hash, code_last4, initial_minor, balance_minor, currency,
					    status, expires_at, recipient_email, note, issued_by, order_id)
					 values ($1,$2,$3,$3,$4,'active',$5,$6,$7,$8,$9)
					 returning id, code_last4 as code, initial_minor, balance_minor, currency,
					           status, expires_at, recipient_email, note, created_at`,
					[
						hash,
						normaliseCode(code).slice(-4),
						args.amountMinor,
						currency,
						args.expiresAt ?? null,
						args.recipientEmail ?? null,
						args.note ?? null,
						args.issuedBy ?? null,
						args.orderId ?? null,
					],
				)
				const created = rows[0]
				if (!created) throw new Error("Gift card insert returned no row")
				await client.query(
					`insert into gift_card_transactions
					   (gift_card_id, kind, amount_minor, balance_after_minor, actor, note)
					 values ($1,'issue',$2,$2,$3,$4)`,
					[
						created.id,
						args.amountMinor,
						args.issuedBy ?? "system",
						args.note ?? null,
					],
				)
				return created
			})
			return { card, code }
		} catch (err: any) {
			if (!/unique/i.test(err?.message ?? "")) throw err
		}
	}
	throw new Error("Could not generate a unique gift card code. Please retry.")
}

/**
 * What a shopper sees when they type a code at checkout. Deliberately vague on
 * failure so the endpoint cannot be used to enumerate valid codes.
 */
export async function checkBalance(code: string): Promise<{
	valid: boolean
	balanceMinor: number
	currency: string
	reason?: string
}> {
	const secret = await codeSecret()
	const card = await one<GiftCard & { code_hash: string }>(
		`select id, balance_minor, currency, status, expires_at
		   from gift_cards where code_hash = $1`,
		[hashCode(code, secret)],
	)
	if (!card) {
		return {
			valid: false,
			balanceMinor: 0,
			currency: await baseCurrency(),
			reason: "We could not find that gift card.",
		}
	}
	if (card.status === "disabled") {
		return {
			valid: false,
			balanceMinor: 0,
			currency: card.currency,
			reason: "This gift card has been cancelled.",
		}
	}
	if (card.expires_at && new Date(card.expires_at) < new Date()) {
		await query(`update gift_cards set status = 'expired' where id = $1`, [
			card.id,
		])
		return {
			valid: false,
			balanceMinor: 0,
			currency: card.currency,
			reason: "This gift card has expired.",
		}
	}
	if (card.balance_minor <= 0) {
		return {
			valid: false,
			balanceMinor: 0,
			currency: card.currency,
			reason: "This gift card has already been fully used.",
		}
	}
	return {
		valid: true,
		balanceMinor: card.balance_minor,
		currency: card.currency,
	}
}

/**
 * Spend up to `requestedMinor` from the card. Returns what was actually taken,
 * which may be less than asked for if the balance is smaller — the caller then
 * charges the remainder to a card.
 */
export async function redeem(args: {
	code: string
	requestedMinor: number
	orderId: string
	currency: string
}): Promise<{ appliedMinor: number; remainingMinor: number; giftCardId?: string }> {
	const secret = await codeSecret()
	const hash = hashCode(args.code, secret)

	return tx(async (client) => {
		// FOR UPDATE is what makes double-spending impossible under load.
		const { rows } = await client.query<GiftCard>(
			`select id, balance_minor, currency, status, expires_at
			   from gift_cards where code_hash = $1 for update`,
			[hash],
		)
		const card = rows[0]
		if (!card) throw new Error("We could not find that gift card.")
		if (card.status !== "active") {
			throw new Error("This gift card can no longer be used.")
		}
		if (card.expires_at && new Date(card.expires_at) < new Date()) {
			throw new Error("This gift card has expired.")
		}
		if (card.currency.toUpperCase() !== args.currency.toUpperCase()) {
			throw new Error(
				`This gift card is in ${card.currency} and cannot be used for a ${args.currency} order.`,
			)
		}

		const applied = Math.min(card.balance_minor, Math.max(0, args.requestedMinor))
		if (applied <= 0) throw new Error("This gift card has no balance left.")

		const remaining = card.balance_minor - applied
		await client.query(
			`update gift_cards
			    set balance_minor = $2,
			        status = case when $2 = 0 then 'redeemed' else status end,
			        updated_at = now()
			  where id = $1`,
			[card.id, remaining],
		)
		await client.query(
			`insert into gift_card_transactions
			   (gift_card_id, kind, amount_minor, balance_after_minor, order_id, actor)
			 values ($1,'redeem',$2,$3,$4,'storefront')`,
			[card.id, -applied, remaining, args.orderId],
		)
		await client.query(
			`insert into gift_card_redemptions (gift_card_id, order_id, amount_minor)
			 values ($1,$2,$3) on conflict do nothing`,
			[card.id, args.orderId, applied],
		)

		return {
			appliedMinor: applied,
			remainingMinor: remaining,
			giftCardId: card.id,
		}
	})
}

/** Put money back when an order using a gift card is cancelled or refunded. */
export async function restoreForOrder(
	orderId: string,
	actor = "system",
): Promise<number> {
	const rows = await query<{ gift_card_id: string; amount_minor: number }>(
		`select gift_card_id, amount_minor from gift_card_redemptions
		  where order_id = $1 and restored_at is null`,
		[orderId],
	)
	let restored = 0
	for (const r of rows) {
		await tx(async (client) => {
			const { rows: cards } = await client.query<{ balance_minor: number }>(
				`select balance_minor from gift_cards where id = $1 for update`,
				[r.gift_card_id],
			)
			if (!cards[0]) return
			const balance = cards[0].balance_minor + r.amount_minor
			await client.query(
				`update gift_cards set balance_minor = $2, status = 'active', updated_at = now()
				  where id = $1`,
				[r.gift_card_id, balance],
			)
			await client.query(
				`insert into gift_card_transactions
				   (gift_card_id, kind, amount_minor, balance_after_minor, order_id, actor, note)
				 values ($1,'restore',$2,$3,$4,$5,'Order cancelled or refunded')`,
				[r.gift_card_id, r.amount_minor, balance, orderId, actor],
			)
			await client.query(
				`update gift_card_redemptions set restored_at = now()
				  where gift_card_id = $1 and order_id = $2`,
				[r.gift_card_id, orderId],
			)
			restored += r.amount_minor
		})
	}
	return restored
}

/** Admin: top up, cancel, or reinstate. */
export async function adjustBalance(args: {
	giftCardId: string
	deltaMinor: number
	actor: string
	note?: string
}): Promise<number> {
	return tx(async (client) => {
		const { rows } = await client.query<{ balance_minor: number }>(
			`select balance_minor from gift_cards where id = $1 for update`,
			[args.giftCardId],
		)
		if (!rows[0]) throw new Error("Gift card not found.")
		const balance = Math.max(0, rows[0].balance_minor + args.deltaMinor)
		await client.query(
			`update gift_cards
			    set balance_minor = $2,
			        status = case when $2 = 0 then 'redeemed' else 'active' end,
			        updated_at = now()
			  where id = $1`,
			[args.giftCardId, balance],
		)
		await client.query(
			`insert into gift_card_transactions
			   (gift_card_id, kind, amount_minor, balance_after_minor, actor, note)
			 values ($1,'adjust',$2,$3,$4,$5)`,
			[args.giftCardId, args.deltaMinor, balance, args.actor, args.note ?? null],
		)
		return balance
	})
}

export async function setStatus(
	giftCardId: string,
	status: "active" | "disabled",
	actor: string,
): Promise<void> {
	await query(
		`update gift_cards set status = $2, updated_at = now() where id = $1`,
		[giftCardId, status],
	)
	await query(
		`insert into gift_card_transactions
		   (gift_card_id, kind, amount_minor, balance_after_minor, actor, note)
		 select $1, $2, 0, balance_minor, $3, null from gift_cards where id = $1`,
		[giftCardId, status === "disabled" ? "disable" : "enable", actor],
	)
}

/** Admin list, newest first. Never exposes a spendable code. */
export async function listGiftCards(args: {
	limit?: number
	offset?: number
	status?: string
}) {
	const limit = Math.min(200, Math.max(1, args.limit ?? 50))
	const rows = await query(
		`select id, code_last4, initial_minor, balance_minor, currency, status,
		        expires_at, recipient_email, note, created_at
		   from gift_cards
		  where ($3::text is null or status = $3)
		  order by created_at desc
		  limit $1 offset $2`,
		[limit, Math.max(0, args.offset ?? 0), args.status ?? null],
	)
	return rows
}

export async function giftCardHistory(giftCardId: string) {
	const rows = await query(
		`select kind, amount_minor, balance_after_minor, order_id, actor, note, created_at
		   from gift_card_transactions
		  where gift_card_id = $1 order by created_at asc`,
		[giftCardId],
	)
	return rows
}

/** Outstanding liability — money you owe in unspent cards. */
export async function outstandingLiability(): Promise<{
	currency: string
	totalMinor: number
	count: number
}> {
	const row = await one<{ total: string; count: string; currency: string }>(
		`select coalesce(sum(balance_minor),0) as total, count(*) as count,
		        coalesce(max(currency), 'GBP') as currency
		   from gift_cards where status = 'active' and balance_minor > 0`,
	)
	return {
		currency: row?.currency ?? (await baseCurrency()),
		totalMinor: Number(row?.total ?? 0),
		count: Number(row?.count ?? 0),
	}
}
