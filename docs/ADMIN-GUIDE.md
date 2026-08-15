# Admin guide

Sign in at `/admin`. Everything below is edited in the panel and saved to the
database — you never edit code to change how the shop looks or behaves.

---

## Dashboard

- **Revenue chart** — daily, weekly or monthly. Built from paid, non-cancelled
  orders only, so it is the money you actually took.
- **This month vs last month**, today's takings, average order value.
- **Orders needing attention** — pending and unfulfilled counts.
- **Top products** by revenue.
- A brand new shop shows zeroes everywhere. Nothing is simulated.

## Orders

The list filters by status, payment state, order number or email.

Open an order to:

- move it along the pipeline (pending → confirmed → processing → ready to ship
  → shipped → out for delivery → delivered → completed, plus on hold, cancelled,
  failed and returned),
- set payment state and record refunds (a full refund flips the order to
  *refunded*, a partial one to *partially refunded*),
- add a courier and tracking number — the customer is emailed automatically,
- read the full history: who changed what, when,
- **Download invoice** — the button on every row and on the order page. It
  generates a proper PDF with your logo, your invoice number series, the
  customer's address, the lines, the totals, and — if the customer paid in a
  different currency — the rate that was used at the time.

Cancelling an order puts its stock back automatically.

## Products

Title, description, images, price, compare-at price, cost, SKU, barcode,
stock, low-stock threshold, categories, variants, SEO fields and a featured
flag. Prices are entered in your base currency; shoppers see their own.

## Content

- **Banners & sliders** — hero slides, promo strips and the announcement bar.
  Each one has an image, headline, subtitle, button, colours, position, and an
  optional start and end date so a sale banner can retire itself.
- **Pages** — About, FAQ, Terms, Privacy, Returns and anything else.
- **Menus** — header and footer links, reorderable.
- **Testimonials** — shown on the home page when the feature is on.

## Settings

### Branding
Store name, tagline, logo, dark-mode logo, favicon, email logo, logo height,
and whether the name shows next to the logo. Change the name here and it
changes in the header, footer, admin sidebar, browser tab, emails and
invoices. Upload a logo, or paste an image URL if your host has a read-only
disk.

### Currency
Pick the currency you price in. Leave **auto-detect visitor country** on and a
visitor from the USA sees dollars on a product you priced in pounds, a visitor
from Germany sees euros, and so on — 37 currencies are supported.

- Rates refresh automatically (hourly by cron, or press **Refresh now**).
- Add an optional **markup %** if you want a cushion against rate movement.
- **Rounding** can tidy converted prices to whole units or .99 endings.
- You can override any single rate by hand.
- Whatever currency the shopper paid in is recorded on the order with the exact
  rate, so invoices and reports stay consistent forever.

### Orders
The order-number prefix is yours: type `SHOP-` and the next order becomes
`SHOP-00001`. You can also set a suffix, how many digits to pad to, the number
to start from, whether to include the year (`SHOP-2026-00001`), and a separate
invoice prefix. A live preview sits under the field.

### Email (SMTP)
Host, port, SSL/STARTTLS, username, password, from name, from address and
reply-to. Press **Send test email** — you get the real error back if it fails.
The password is encrypted in the database and shown masked afterwards. Every
send attempt is logged.

### Notifications
Who gets told when an order is placed, when it is paid, when stock runs low,
when someone uses the contact form, and when a review is left. There is also a
bell in the admin header with an unread count.

**When a customer places an order:** a bell notification appears instantly, and
an email goes to every address listed here with the order number, the items,
the total and a link straight to the order. The customer gets their own
confirmation at the same time. If email is misconfigured the order is still
saved — notifications never block a sale.

### Features
One switch per feature. Wishlist, reviews and review moderation, newsletter,
contact form, hero slider, promo banner, announcement bar, testimonials,
related products, back-in-stock alerts, guest checkout, coupons, multi-currency,
customer invoice downloads, search, dark mode, and **maintenance mode** (the
shop shows a friendly notice; the admin panel stays open).

### Payments, shipping, tax, SEO, social, legal
Payment methods on/off, flat shipping rate and free-shipping threshold, tax
rate and whether prices include tax, meta titles and descriptions, social
links, and your legal page references.

## People and safety

- **Staff** — eight roles from Super Admin down to read-only Auditor, with
  per-person permission overrides. You can suspend an account or unlock one
  that has locked itself out.
- **Audit log** — every change, with who, when, from which IP, and the before
  and after values.
- **Developer zone** (super admins and developers only) — runtime info, email
  log, active sessions, cache clear, and "sign everyone else out".

## Phones and tablets

The panel is built for a 320 px phone upward: the sidebar becomes a slide-over
drawer, tables become stacked cards, and every button is at least 44 × 44 px.
You can process an order from your phone.
