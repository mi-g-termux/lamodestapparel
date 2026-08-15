# Status report — read this first

An honest account of what was built, what changed from the master prompt, and
what you still have to do. I would rather you know now than discover it later.

---

## What the zip you sent me actually contained

Both folders were **front-end only**. There was no backend, no database, no
API, no email, no payments — in either one.

- `admin/` — a React (TanStack Start + Vite) app with 38 screens whose entire
  dataset came from a 1,372-line `seed.ts` file kept in the browser's
  localStorage. Every product, order, customer and £ figure on the dashboard
  was invented. Staff passwords sat in that file in plain text.
- `store/velora-storefront/` — a separate React app with its own local store
  and hard-coded content in `src/content/site.ts`.

They were not "two halves of a website that needed reconnecting". They were two
unconnected demos. So "wire the frontend and backend together" meant **writing
the backend from scratch**, and that is what most of this work is.

## What was built

### One application instead of two
The two apps are merged into `web/`: the shop at `/`, the admin panel at
`/admin`, one build, one deployment, one domain. The admin screens kept their
layout and components; their data layer was replaced underneath them.

### A real backend (`server/`)
Express + TypeScript in strict mode, talking to Postgres through parameterised
queries. 40 tables covering settings, media, products, variants, categories,
orders, order lines, status history, invoices, payments, refunds, customers,
addresses, coupons, shipping, tax, banners, pages, navigation, testimonials,
reviews, subscribers, contact messages, notifications, staff, sessions,
login attempts, rate limits, audit log and exchange rates.

### Your specific requests

| You asked for | What happens now |
| --- | --- |
| Admin notified when an order is placed | Bell notification instantly + email to every address in Settings → Notifications, with the items, total and a link to the order. The customer gets their own confirmation. Email failure never loses the order. |
| Turn any feature on/off | 34 switches in Settings → Features. The server checks the switch too, so a disabled feature's API endpoint refuses politely instead of just hiding a button. |
| Banners and sliders controlled by admin | Content → Banners: image, headline, subtitle, button, colours, order, and optional start/end dates. |
| GBP priced, USD shown to Americans | Prices are stored once in your base currency. The visitor's country is detected from the CDN header, mapped to a currency, and converted with a live rate (37 currencies). They can also switch manually. The rate used is saved on the order forever. |
| Revenue chart, monthly sales | Built from paid, non-cancelled orders in SQL. Day/week/month granularity. A new shop reads zero. |
| Fresh start, no fake sales | The demo dataset is gone. `emptyState()` replaces it. |
| Invoice download button in Orders | Every order row and detail page has one. Generates a branded PDF with its own invoice-number series. Customers can download theirs too if you enable that switch. |
| Choose the order-number prefix | Settings → Orders: prefix, suffix, padding, start number, optional year. Live preview. Numbers come from a Postgres sequence so two shoppers can never collide. |
| Choose the store logo and name | Settings → Branding: name, tagline, logo, dark logo, favicon, email logo. "Velora" is now only a default value, not hard-coded. It flows to the header, footer, admin sidebar, page titles, emails and invoices. |
| SMTP | Fully in the admin panel, with a real **Send test email** button that reports the actual error. Password encrypted at rest, masked when read back, every send logged. |
| Not hackable | Server-side price recalculation at checkout, scrypt passwords, HttpOnly sessions, CSRF tokens, the lock-out ladder, SQL parameterisation everywhere, rate limits, security headers, upload type/size limits, SVG sanitising, secrets encrypted with AES-256-GCM, full audit trail. |
| Easy on cPanel and Vercel | `server.js` for cPanel Passenger, `api/index.js` + `vercel.json` for Vercel, plus Dockerfile, compose file, PM2 config, `.htaccess` and cron lines. |

---

## Deviations from the master prompt — please read

**1. Not Next.js, and not the `/apps/*` + `/packages/*` monorepo.**
The prompt specified Next.js App Router in a six-package monorepo. Your actual
code was TanStack Start + Vite. Rewriting 60 screens into Next.js would have
meant rebuilding your UI rather than wiring it up, and a Next.js standalone
build is harder to run on shared cPanel hosting than a plain Express process.
So the shape is `server/` + `web/`. Every *capability* the prompt asked for is
here; the folder names differ.

**2. Supabase is used as a Postgres database, not as Auth/RLS.**
Authentication is handled by the Express server (scrypt + sessions) because the
admin panel is server-rendered by the same process, and RLS policies would not
protect a single-connection Node app anyway. Permissions are enforced in the
API layer on every route. Supabase Storage, Realtime and Edge Functions are not
used.

**3. Payments are now fully implemented — but the keys must be yours.**
Stripe (hosted Checkout, refunds, disputes) and PayPal (Orders v2, capture,
refunds) make real API calls, with signed webhook verification and
exactly-once processing. Nothing is stubbed.

What I could not do is *create* the credentials. Stripe and PayPal issue keys
against a verified business identity — your name, your bank account, your tax
details. A key I invented would be fake, and a key from anywhere else would be
someone else's money and a criminal matter. It takes five minutes per provider:
`docs/integrations.md` walks you through both, including which webhook events to
subscribe to.

Until you paste keys, Stripe and PayPal simply do not appear as options at
checkout — a shopper can never pick a method that would fail at the last step.
Cash on delivery and bank transfer work with no keys at all.

**4. Also now built:** SMS and WhatsApp across ten providers (shipped switched
off so a test order cannot text a stranger), the image-resizing service with
AVIF/WebP/JPEG variants, disk caching, EXIF stripping and LQIP placeholders, and
gift cards with hashed codes, an append-only ledger, partial redemption,
lock-protected redeeming and automatic restore on refund.

**Still not built:** courier label APIs (Shippo/FedEx/DHL), abandoned-cart
recovery emails, and the Vitest/Playwright/pgTAP test suites. Manual tracking
numbers work today and email the customer a tracking link. Carrier label buying
is not a keys problem — each carrier needs account numbers, negotiated rates,
pickup addresses and package presets before a label is valid, and guessing those
prints labels you have paid for and cannot use.

**5. The build has not been run.**
This is the important one. The sandbox I built in lost access to the npm
registry partway through, so `npm install` could not complete and neither
`tsc` nor `vite build` was ever executed. The code is written carefully and
typed, but it has **not been compiled or executed even once**. Expect a first
pass of type errors and import fixes:

```bash
npm run install:all
npm run typecheck     # fix what it reports
npm run build
```

The most likely places to need attention are the admin screens that still
reference fields from the old demo dataset (`seed.ts` shapes) that the server
document does not provide, and any component importing `attemptLogin`, which is
now asynchronous. `web/src/lib/velora/seed.ts` is kept only so the settings and
content *shape* still type-checks; delete it once everything compiles.

**6. Responsive work is inherited, not re-verified.**
The original components were already built mobile-first with Tailwind. I kept
that and used 44 px touch targets on the new screens, but I could not open a
browser to check the breakpoints from 320 px to 2560 px. Please walk the admin
panel on a phone before you go live.

---

## Suggested order of work

1. `npm run install:all && npm run typecheck` — clear the errors.
2. Point `DATABASE_URL` at a free Supabase project, run `npm run migrate` and
   `npm run seed:admin`.
3. `npm run build && npm start`, then click through `/admin`.
4. Set your branding, currency, order prefix and SMTP; send a test email.
5. Add one product, place one test order, download its invoice.
6. Deploy — `docs/hosting.md` has the cPanel steps.

If something does not compile, the fix is almost always a field name: the
server's document is described in `server/src/routes/state.ts`, and that file
is the contract between the API and the admin screens.
