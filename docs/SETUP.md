# Setup guide

You need three things: a Postgres database, Node 20 or newer, and about ten
minutes. Everything else — shop name, logo, currency, email, feature switches
— is configured later inside the admin panel, not in files.

---

## 1. Get a database

Any Postgres works. The easiest free option is Supabase:

1. Create a project at supabase.com.
2. Open **Project settings → Database → Connection string → URI**.
3. Copy it. That string is your `DATABASE_URL`.

On cPanel you can instead create a Postgres database from the control panel and
build the string yourself: `postgresql://user:password@localhost:5432/dbname`.

## 2. Create your `.env`

```bash
cp .env.example .env
```

Fill in three values:

| Variable | What to put |
| --- | --- |
| `DATABASE_URL` | The string from step 1 |
| `APP_SECRET` | 32+ random characters (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `SITE_URL` | Your public address, no trailing slash |

`APP_SECRET` encrypts your saved SMTP and payment credentials. If you change it
later you will have to re-enter those secrets.

## 3. Install, migrate, create your login

```bash
npm run install:all     # installs server + web dependencies
npm run migrate         # creates every table and the default settings
npm run seed:admin      # creates your super admin account
npm run build           # compiles the server and builds the site
```

`npm run seed:admin` asks for an email and password. Leave the password blank
and it generates a strong one and prints it once — copy it immediately.

If you prefer, run all four with `npm run setup`.

### Supabase without a shell

Open the Supabase **SQL Editor**, paste the contents of
`server/sql/001_schema.sql`, and run it. Then run `npm run seed:admin` locally
once, pointing at the same `DATABASE_URL`, to create your login.

## 4. Start it

```bash
npm start
```

Visit your site at `/` and the admin panel at `/admin`.

---

## 5. First ten minutes in the admin panel

Do these in order and the shop is live:

1. **Settings → Branding** — set your store name, upload your logo and favicon.
   The old "Velora" name only exists as a default; the moment you change it,
   the header, footer, admin sidebar, emails, invoices and page titles all
   follow.
2. **Settings → Currency** — pick the currency you price in (your base
   currency). Leave *auto-detect visitor country* on so a shopper in the USA
   sees US dollars on a product you priced in pounds.
3. **Settings → Orders** — choose your order-number prefix. The preview under
   the field shows exactly what your next order number will look like.
4. **Settings → Email (SMTP)** — enter your mail host, then press **Send test
   email**. Nothing is saved as "working" until that test passes.
5. **Settings → Notifications** — add the email addresses that should be told
   when an order comes in.
6. **Settings → Features** — switch off anything you do not want (wishlist,
   reviews, newsletter, the announcement bar, and so on).
7. **Content → Banners & sliders** — replace the placeholder hero.
8. **Products** — add your first product.

Your dashboard will read zero revenue and zero orders until a real order is
placed. That is deliberate: there is no demo data anywhere in this build.

---

## Troubleshooting

**"Database connection failed" on boot.** Check `DATABASE_URL`. Hosted
providers usually need SSL — the app enables it automatically for Supabase,
Neon, Render, Heroku and RDS hostnames, or when the string ends in
`?sslmode=require`.

**Uploads fail on Vercel.** Vercel's disk is read-only. Use **Add image by
URL** in the media picker, or host images on Supabase Storage. Everything else
works normally there.

**Emails do not arrive.** Use **Send test email** in Settings → Email. The
exact SMTP error is shown, and every attempt is logged under Developer → Email
log. Port 587 with STARTTLS suits most hosts; port 465 needs *Use SSL* on.

**Locked out of the admin panel.** Five wrong passwords start a lock-out that
grows each time. Wait it out, or run `npm run seed:admin` again with the same
email to reset the password and clear the lock.
