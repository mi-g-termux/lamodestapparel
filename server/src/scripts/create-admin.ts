import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomBytes } from "node:crypto";
import { pool, query, one } from "../db.js";
import { hashPassword, passwordProblems } from "../security.js";
import { ensureDefaults } from "../settings.js";

/**
 * Creates (or resets) the first super admin.
 *
 *   npm run seed:admin                       → interactive prompts
 *   ADMIN_EMAIL=you@shop.com ADMIN_PASSWORD='...' npm run seed:admin
 *
 * If no password is supplied a strong one is generated and printed once.
 */
async function main(): Promise<void> {
  await ensureDefaults();

  let email = process.env.ADMIN_EMAIL ?? "";
  let password = process.env.ADMIN_PASSWORD ?? "";
  let name = process.env.ADMIN_NAME ?? "";

  if (!email && stdin.isTTY) {
    const rl = createInterface({ input: stdin, output: stdout });
    email = (await rl.question("Admin email: ")).trim();
    name = (await rl.question("Full name: ")).trim();
    password = (await rl.question("Password (blank = generate one): ")).trim();
    rl.close();
  }

  if (!email.includes("@")) throw new Error("A valid email address is required (set ADMIN_EMAIL).");

  let generated = false;
  if (!password) {
    password = `${randomBytes(9).toString("base64url")}Aa1!`;
    generated = true;
  }
  const problems = passwordProblems(password);
  if (problems.length) throw new Error(`Password ${problems.join(", ")}.`);

  const existing = await one<{ id: string }>(`select id from admin_users where lower(email) = lower($1)`, [email]);
  if (existing) {
    await query(
      `update admin_users set password_hash = $1, role = 'super_admin', status = 'active',
              failed_attempts = 0, locked_until = null, must_change_password = $2 where id = $3`,
      [hashPassword(password), generated, existing.id],
    );
    console.log(`\n✓ Reset the password for existing super admin ${email}`);
  } else {
    await query(
      `insert into admin_users (email, name, password_hash, role, status, must_change_password)
       values ($1,$2,$3,'super_admin','active',$4)`,
      [email.toLowerCase(), name || email, hashPassword(password), generated],
    );
    console.log(`\n✓ Created super admin ${email}`);
  }

  if (generated) {
    console.log(`  Temporary password: ${password}`);
    console.log("  Save it now — it is not stored anywhere in readable form.");
  }
  console.log("  Sign in at /admin/login\n");
  await pool.end();
}

main().catch((error: unknown) => {
  console.error("\nCould not create the admin user:", error instanceof Error ? error.message : error);
  process.exit(1);
});
