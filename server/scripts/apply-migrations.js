import pg from 'pg';
const { Pool } = pg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file manually
const envPath = path.join(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const pool = new Pool({
  connectionString: envVars.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('Connected to database, running migrations...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/001_design_tokens_settings_blocks.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration: 001_design_tokens_settings_blocks.sql');
    console.log('Migration file size:', migrationSQL.length, 'bytes\n');

    // Split and execute statements
    await client.query(migrationSQL);
    console.log('✅ Migration 001 applied successfully\n');

    // Read seed file
    const seedPath = path.join(__dirname, '../seeds/001_seed_data.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');

    console.log('Applying seed: 001_seed_data.sql');
    console.log('Seed file size:', seedSQL.length, 'bytes\n');

    await client.query(seedSQL);
    console.log('✅ Seed 001 applied successfully\n');

    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('design_tokens', 'content_block_types', 'pages', 'page_blocks',
                         'navigation_items', 'settings', 'translations', 'currencies',
                         'countries', 'country_subdivisions', 'tax_rates',
                         'payment_providers', 'couriers')
      ORDER BY table_name
    `);

    console.log('📋 Tables created:', tablesResult.rows.length);
    tablesResult.rows.forEach(row => console.log('   ✓', row.table_name));

    // Verify seed data
    const currencies = await client.query('SELECT COUNT(*) FROM currencies');
    const countries = await client.query('SELECT COUNT(*) FROM countries');
    const settings = await client.query('SELECT COUNT(*) FROM settings');
    const tokens = await client.query('SELECT COUNT(*) FROM design_tokens');
    const pages = await client.query('SELECT COUNT(*) FROM pages');

    console.log('\n📊 Seed data:');
    console.log('   Currencies:', currencies.rows[0].count);
    console.log('   Countries:', countries.rows[0].count);
    console.log('   Settings namespaces:', settings.rows[0].count);
    console.log('   Design token groups:', tokens.rows[0].count);
    console.log('   Default pages:', pages.rows[0].count);

    console.log('\n✅ All migrations applied successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
