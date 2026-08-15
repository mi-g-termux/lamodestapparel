# Integrations: where to get each key and where to paste it

Every integration below is **fully implemented**. None of them needs a code
change to go live — you paste credentials into the admin panel and they start
working on the next request.

One thing I cannot do for you: **create the keys**. Stripe, PayPal and Twilio
issue credentials against a verified business identity — your name, your bank
account, your tax details. Any key I could invent would be fake, and any key
from somewhere else would be someone else's money. Each one below takes about
five minutes to obtain.

---

## Stripe (cards, Apple Pay, Google Pay)

**Get the keys**

1. Sign up at stripe.com and finish the business verification.
2. **Developers → API keys** → copy the **Secret key** (`sk_live_…`, or
   `sk_test_…` while you experiment) and the **Publishable key** (`pk_…`).
3. **Developers → Webhooks → Add endpoint**
   - URL: `your-site.com/api/public/payments/webhook/stripe`
   - Events: `checkout.session.completed`,
     `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`,
     `payment_intent.succeeded`, `payment_intent.payment_failed`,
     `charge.refunded`, `charge.dispute.created`
   - Copy the **Signing secret** (`whsec_…`).

**Paste them into** Settings → Payments → Stripe: secret key, publishable key,
webhook secret. Switch Stripe on, press **Test connection** — it tells you
whether you are in live or test mode.

**What happens then.** The shopper picks Card, goes to Stripe's hosted page,
pays, comes back. We confirm the payment server-to-server — the browser's word
is never trusted — mark the order paid, generate the invoice, ring the admin
bell and send both emails. The webhook does the same job independently, so a
shopper who closes the tab mid-payment still gets a completed order.

Refunds from the Orders screen call Stripe for real. Chargebacks put the order
on hold automatically.

## PayPal

**Get the keys**

1. developer.paypal.com → **Apps & Credentials**.
2. Toggle **Sandbox** or **Live**, create an app, copy the **Client ID** and
   **Secret**.
3. In the same app, add a webhook:
   - URL: `your-site.com/api/public/payments/webhook/paypal`
   - Events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`,
     `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`,
     `CUSTOMER.DISPUTE.CREATED`
   - Copy the **Webhook ID**.

**Paste them into** Settings → Payments → PayPal, and leave **Sandbox mode** on
until you have placed a test order. Switching to live is one checkbox.

Orders v2 with `intent: CAPTURE`. We send PayPal the full breakdown — items,
shipping, tax, discount — so it independently checks the arithmetic. Capture
happens server-side on return, and if PayPal's webhook beats the redirect the
double-capture is handled gracefully.

## SMS and WhatsApp

Ten providers are implemented: Twilio, Vonage, MessageBird, Plivo, Telnyx,
Infobip, WhatsApp Cloud API, any generic JSON endpoint, and a `log` mode that
prints to the server log so you can test the wiring without spending anything.

**Shipped switched off**, deliberately — a test order should not text a
stranger.

| Provider | Where to get credentials |
| --- | --- |
| Twilio | console.twilio.com → Account SID, Auth Token, and a phone number or Messaging Service SID |
| Vonage | dashboard.nexmo.com → API key and secret |
| MessageBird | dashboard.messagebird.com → Access key |
| Plivo | console.plivo.com → Auth ID and Auth Token |
| Telnyx | portal.telnyx.com → API key |
| Infobip | portal.infobip.com → API key and your account's base URL |
| WhatsApp | developers.facebook.com → WhatsApp → Phone number ID and token |

Settings → SMS: pick the provider, paste the credentials, set a default country
code, press **Send test SMS**. Then choose which events text the customer
(order placed, order shipped). Every attempt is logged with the provider's own
error message, so a failure is never a mystery.

## Image resizing

No keys, no third party, no monthly bill. `GET /api/img/<file>?w=768&q=75`
resizes on first request, caches to disk, and serves from cache afterwards with
immutable cache headers. It picks AVIF, then WebP, then JPEG based on what the
visitor's browser says it accepts. Widths are limited to eight fixed sizes so
nobody can make your server render ten thousand variants of one photo.

It uses `sharp`, which is optional: `npm --prefix server install sharp`. If
sharp will not build on your host — some shared hosting cannot compile it — the
feature degrades to serving the original file rather than breaking the site.
Uploads are also stripped of EXIF data (which can contain the photographer's GPS
location) and capped at 2560px, and each one gets a 20px blurred placeholder so
the storefront has no layout shift.

## Gift cards and store credit

No keys. Fully working:

- Issue a card for any amount, with an optional expiry and recipient email.
- Codes use an unambiguous alphabet (no 0/O/1/I) and are stored **hashed** — a
  stolen database dump is not spendable.
- Redeeming locks the card row in the database, so two simultaneous checkouts
  can never spend the same balance twice.
- Partial redemption works: the card covers what it can and the shopper pays the
  rest by card.
- Cancel or refund an order and the balance goes back automatically.
- Every movement is an append-only ledger row, so any balance can be re-derived
  and defended.
- The dashboard shows your outstanding liability — money you owe in unspent
  cards.

## Couriers

Shipment label and tracking tables are in place (`shipment_labels`,
`tracking_events`, with a 15-minute polling cron). Manual tracking numbers work
today: type one into an order and the customer is emailed a tracking link.

Shippo / FedEx / DHL label buying is **not** wired to their APIs. That is not a
keys problem — each carrier needs account numbers, negotiated rates, pickup
addresses and package presets before a single label is valid, and getting it
wrong prints labels you have paid for and cannot use. Add it when you know which
carrier you are actually using.

---

## Testing money without spending money

1. Stripe test mode: card `4242 4242 4242 4242`, any future expiry, any CVC.
   Card `4000 0000 0000 0002` is declined, `4000 0025 0000 3155` triggers 3-D
   Secure.
2. PayPal sandbox: developer.paypal.com → **Testing tools → Sandbox accounts**
   gives you a fake buyer login.
3. For webhooks on your laptop, run `stripe listen --forward-to
   localhost:3000/api/public/payments/webhook/stripe`.

Place one test order per provider, confirm the bell rings, the email arrives and
the invoice PDF downloads. Then switch to live keys.

## Why webhooks matter

The shopper's browser is not a reliable narrator. It can close the tab, lose
signal, or be tampered with. So an order is marked paid by two independent
paths: the server-to-server confirmation when they return, and the signed
webhook. Whichever arrives first wins; the second becomes a no-op thanks to a
unique key on the gateway reference.

Underpayment is never silently accepted — if the gateway reports less than the
order total, the order goes **on hold** for a human instead of being marked
paid.
