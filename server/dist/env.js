import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
/**
 * Minimal .env loader — no dotenv dependency.
 *
 * Hosts differ: Vercel and cPanel inject real environment variables, but on a
 * laptop the values live in a .env file. Without this, `npm run migrate` on a
 * fresh clone dies with "DATABASE_URL is required" even though the file exists.
 *
 * Real environment variables always win, so this can never override a value
 * your host has set in production.
 */
function loadDotEnv() {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
        process.env.ENV_FILE, // explicit override
        path.resolve(process.cwd(), ".env"), // run from server/
        path.resolve(process.cwd(), "..", ".env"), // run from repo root via --prefix
        path.resolve(here, "..", ".env"), // server/.env  (dist/env.js)
        path.resolve(here, "..", "..", ".env"), // repo root .env
        path.resolve(here, "..", "..", "..", ".env"),
    ].filter((p) => typeof p === "string" && p.length > 0);
    const seen = new Set();
    for (const file of candidates) {
        if (seen.has(file) || !existsSync(file))
            continue;
        seen.add(file);
        let raw;
        try {
            raw = readFileSync(file, "utf8");
        }
        catch {
            continue;
        }
        // Strip a UTF-8 BOM: Windows editors add one and it corrupts the first key.
        if (raw.charCodeAt(0) === 0xfeff)
            raw = raw.slice(1);
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#"))
                continue;
            const eq = trimmed.indexOf("=");
            if (eq <= 0)
                continue;
            const key = trimmed.slice(0, eq).replace(/^export\s+/, "").trim();
            if (!key || key in process.env)
                continue; // never clobber the real thing
            let value = trimmed.slice(eq + 1).trim();
            const quoted = (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
                (value.startsWith("'") && value.endsWith("'") && value.length > 1);
            if (quoted) {
                value = value.slice(1, -1);
            }
            else {
                const hash = value.indexOf(" #"); // trailing comment on an unquoted value
                if (hash >= 0)
                    value = value.slice(0, hash).trim();
            }
            process.env[key] = value;
        }
    }
}
loadDotEnv();
/**
 * Environment is INFRASTRUCTURE ONLY.
 * Every piece of business configuration (store name, logo, SMTP, currency,
 * order prefix, feature flags...) lives in the `settings` table and is edited
 * from the admin panel. That is what makes this deployable by a non-developer.
 */
const Schema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
    PORT: z.coerce.number().int().positive().default(3000),
    /** Postgres / Supabase pooled connection string. */
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    /** Public origin, e.g. https://shop.example.com  (no trailing slash). */
    SITE_URL: z.string().url().default("http://localhost:3000"),
    /** 32+ char random string. Signs sessions and encrypts SMTP passwords. */
    APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
    /** Where uploaded media is written when using the local disk driver. */
    UPLOAD_DIR: z.string().default("./uploads"),
    /** vercel = serverless/read-only fs, node = cPanel/VPS. */
    DEPLOY_TARGET: z.enum(["vercel", "node"]).default("node"),
    /** Shared secret required by /api/cron/* endpoints. */
    CRON_SECRET: z.string().optional(),
    /** Comma separated extra allowed origins for CORS. */
    ALLOWED_ORIGINS: z.string().optional(),
    /** Set to "true" only behind a trusted proxy (cPanel/Nginx/Vercel). */
    TRUST_PROXY: z.string().optional(),
});
const parsed = Schema.safeParse(process.env);
if (!parsed.success) {
    const issues = parsed.error.issues
        .map((i) => `  \u2022 ${i.path.join(".")}: ${i.message}`)
        .join("\n");
    console.error(`\n\u274c Invalid environment configuration:\n${issues}\n`);
    console.error("Copy .env.example to .env and fill in the values.\n");
    process.exit(1);
}
export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isServerless = env.DEPLOY_TARGET === "vercel";
//# sourceMappingURL=env.js.map