# Hosting

The same code runs on cPanel, Vercel, Docker or a plain VPS. Pick one.

---

## cPanel (shared hosting) — recommended for you

1. **Build on your computer first** (shared hosts are slow and often run out of
   memory during a build):

   ```bash
   npm run install:all
   npm run build
   ```

2. **Upload** the whole folder to your account, but skip `node_modules` and
   `.git`. You do need: `server/dist`, `server/sql`, `server/package.json`,
   `web/dist`, `package.json`, `server.js`, `.htaccess`.

3. **cPanel → Setup Node.js App**

   | Field | Value |
   | --- | --- |
   | Node.js version | 20 or newer |
   | Application mode | Production |
   | Application root | the folder you uploaded |
   | Application URL | your domain |
   | Application startup file | `server.js` |

4. Add your environment variables in the same screen: `DATABASE_URL`,
   `APP_SECRET`, `SITE_URL`, `CRON_SECRET`, `DEPLOY_TARGET=node`,
   `TRUST_PROXY=1`.

5. Click **Run NPM Install**, then open the terminal button and run:

   ```bash
   npm --prefix server run migrate
   npm --prefix server run seed:admin
   ```

6. **Restart** the app. Visit your domain, then `/admin`.

7. **cPanel → Cron Jobs** — add these (replace the secret and domain):

   ```
   0 * * * *    curl -s "https://yourshop.com/api/cron/fx?key=YOUR_CRON_SECRET"
   */15 * * * * curl -s "https://yourshop.com/api/cron/low-stock?key=YOUR_CRON_SECRET"
   */10 * * * * curl -s "https://yourshop.com/api/cron/stuck-payments?key=YOUR_CRON_SECRET"
   30 3 * * *   curl -s "https://yourshop.com/api/cron/cleanup?key=YOUR_CRON_SECRET"
   ```

   Without the first one, exchange rates simply stay at their last known values
   — the shop keeps working.

**Uploads** are written to `UPLOAD_DIR` (default `./uploads`) and served from
`/uploads`. Make sure that folder is writable.

---

## Vercel

1. Push the repository to GitHub and import it in Vercel.
2. Environment variables: `DATABASE_URL`, `APP_SECRET`, `SITE_URL`,
   `CRON_SECRET`, and `DEPLOY_TARGET=vercel`.
3. Deploy. `vercel.json` already routes `/api/*` to the serverless function,
   serves the built site, and registers the four cron jobs.
4. Run the migration once from your machine with the same `DATABASE_URL`:

   ```bash
   npm --prefix server run migrate
   npm --prefix server run seed:admin
   ```

   Or paste `server/sql/001_schema.sql` into the Supabase SQL editor.

**One caveat:** Vercel's filesystem is read-only, so file uploads are refused
with a clear message. Use **Add image by URL** in the media picker, or point
your images at Supabase Storage. Everything else behaves identically.

Use a pooled connection string on Vercel (Supabase's port 6543 pooler) —
serverless functions open many short-lived connections.

---

## Docker / VPS

```bash
docker compose up -d --build
docker compose exec app node server/dist/scripts/migrate.js
docker compose exec app node server/dist/scripts/create-admin.js
```

Edit the passwords and `APP_SECRET` in `docker-compose.yml` first.

With PM2 instead of Docker:

```bash
npm run install:all && npm run build
npm run migrate && npm run seed:admin
pm2 start ecosystem.config.js && pm2 save
```

Put Nginx or Apache in front for TLS, and keep `TRUST_PROXY=1`.

---

## Health and monitoring

`GET /api/health` returns the database status, Node version and uptime. Point
an uptime monitor at it.

## Backups

Your data is entirely in Postgres. Supabase takes daily backups on paid plans;
otherwise schedule `pg_dump`:

```
0 2 * * * pg_dump "$DATABASE_URL" | gzip > ~/backups/shop-$(date +\%F).sql.gz
```

Also back up your `uploads` folder if you are not using object storage.

## Moving hosts

Copy the database, copy `uploads`, copy `.env`, deploy the code. There is no
other state.
