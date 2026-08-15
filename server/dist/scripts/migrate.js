import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";
import { ensureDefaults } from "../settings.js";
/**
 * Applies every .sql file in /sql in filename order, then seeds default
 * settings. Safe to run repeatedly — the SQL is written with IF NOT EXISTS.
 *
 *   npm run migrate
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(here, "../../sql");
async function main() {
    const files = (await fs.readdir(sqlDir)).filter((f) => f.endsWith(".sql")).sort();
    if (!files.length)
        throw new Error(`No .sql files found in ${sqlDir}`);
    const client = await pool.connect();
    try {
        await client.query(`create table if not exists schema_migrations (
         filename text primary key,
         applied_at timestamptz not null default now()
       )`);
        for (const file of files) {
            const done = await client.query(`select 1 from schema_migrations where filename = $1`, [file]);
            if (done.rowCount) {
                console.log(`• ${file} (already applied)`);
                continue;
            }
            const sql = await fs.readFile(path.join(sqlDir, file), "utf8");
            process.stdout.write(`→ ${file} ... `);
            await client.query("begin");
            try {
                await client.query(sql);
                await client.query(`insert into schema_migrations (filename) values ($1)`, [file]);
                await client.query("commit");
                console.log("done");
            }
            catch (error) {
                await client.query("rollback");
                console.log("failed");
                throw error;
            }
        }
    }
    finally {
        client.release();
    }
    await ensureDefaults();
    console.log("\n✓ Database is up to date and default settings are in place.");
    await pool.end();
}
main().catch((error) => {
    console.error("\nMigration failed:", error instanceof Error ? error.message : error);
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map