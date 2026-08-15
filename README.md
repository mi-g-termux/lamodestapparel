# Your store platform

One repository that contains three things and deploys as one app:

```
web/      the shop and the admin panel (one React app: / and /admin)
server/   the API, database schema, email, invoices, currency engine
docs/     setup, admin guide, hosting, and an honest status report
```

The storefront and the admin panel used to be two separate front-end-only
projects with demo data in the browser. They are now a single application
sitting on a real Postgres database: every product, order, banner, setting and
logo lives in the database, and the admin panel is what writes it.

## Quick start

```bash
cp .env.example .env      # fill in DATABASE_URL, APP_SECRET, SITE_URL
npm run setup             # install, migrate, create your admin, build
npm start
```

Shop: `/` — Admin: `/admin`

Full walkthrough: **[docs/SETUP.md](docs/SETUP.md)**
What every admin screen does: **[docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md)**
Vercel / cPanel / Docker: **[docs/hosting.md](docs/hosting.md)**
What is finished and what is not: **[docs/STATUS.md](docs/STATUS.md)**

## What the admin panel controls

| Area | You can change |
| --- | --- |
| Branding | Store name, logo, dark logo, favicon, email logo, colours |
| Currency | Base currency, auto-detect by country, live rates, manual overrides, rounding |
| Orders | Number prefix, padding, yearly reset, invoice series, low-stock threshold |
| Email | Full SMTP settings with a real "send test email" button |
| Notifications | Who is emailed when an order arrives; in-panel bell |
| Features | 30+ on/off switches: wishlist, reviews, newsletter, sliders, maintenance mode… |
| Content | Hero sliders, promo banners, announcement bar, menus, CMS pages, testimonials |
| Catalogue | Products, variants, stock, categories, images, discounts |
| Orders desk | Status pipeline, refunds, tracking, **invoice PDF download** |
| People | Staff accounts with eight roles, audit log, session control |

Nothing about your business lives in environment variables. `.env` holds the
database string and two secrets — that is all.

## Security posture

- Passwords stored as scrypt hashes; never compared in the browser.
- HttpOnly, SameSite session cookies plus double-submit CSRF tokens on writes.
- Failed-login ladder: 5 attempts → 15 min, then 30 min, 1 h, 4 h, 12 h, 24 h.
- Postgres-backed sliding-window rate limits on login, checkout, contact,
  reviews, invoice downloads and SMTP tests.
- Every SQL statement is parameterised; no string-built queries.
- Prices, discounts and stock are recalculated on the server at checkout — the
  browser cannot set what it pays.
- SMTP and payment secrets encrypted at rest with AES-256-GCM and masked when
  read back.
- Security headers (CSP, HSTS, nosniff, frame options, permissions policy),
  uploads restricted by type and size, SVGs sanitised.
- Every admin write is recorded in the audit log with actor, IP and a before/
  after snapshot.
