import pg from "pg";
import { env, isProd } from "./env.js";

// Supabase / most managed Postgres need TLS but present a chain Node does not
// bundle. Verify when we can, fall back to encrypted-but-unverified otherwise.
const needsSsl = /supabase|neon|render|heroku|amazonaws|sslmode=require/i.test(env.DATABASE_URL);

// `?sslmode=require` in the URL makes pg build its own verify-full TLS config,
// which overrides the `ssl` option below and then rejects Supabase's pooler
// certificate with "self-signed certificate in certificate chain". TLS is
// managed here, so strip those parameters and keep one source of truth.
function stripSslParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("uselibpqcompat");
    return parsed.toString();
  } catch {
    return url
      .replace(/([?&])(sslmode|uselibpqcompat)=[^&]*/gi, "$1")
      .replace(/[?&]$/, "");
  }
}

const connectionString = stripSslParams(env.DATABASE_URL);

export const pool = new pg.Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  max: env.DEPLOY_TARGET === "vercel" ? 1 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  console.error("[db] idle client error", err.message);
});

// Postgres returns bigint/numeric as strings to avoid precision loss. All our
// *_minor columns are integers that fit comfortably in a JS number.
pg.types.setTypeParser(20, (v) => Number(v)); // int8
pg.types.setTypeParser(1700, (v) => Number(v)); // numeric

export type Row = Record<string, unknown>;

export async function query<T extends Row = Row>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const started = Date.now();
  try {
    const res = await pool.query(text, params as never[]);
    const ms = Date.now() - started;
    if (!isProd && ms > 200) console.warn(`[db] slow (${ms}ms): ${text.slice(0, 90)}`);
    return res.rows as T[];
  } catch (err) {
    console.error(`[db] query failed: ${text.slice(0, 160)}`, (err as Error).message);
    throw err;
  }
}

export async function one<T extends Row = Row>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run a set of statements in a single transaction. */
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function healthcheck(): Promise<boolean> {
  try {
    await pool.query("select 1");
    return true;
  } catch {
    return false;
  }
}
