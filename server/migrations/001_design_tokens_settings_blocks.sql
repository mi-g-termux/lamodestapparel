-- Phase 1: Design Tokens, Settings, and Content Blocks Schema
-- This migration creates the foundation for a database-driven, theme-editable platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- DESIGN TOKENS (Theme: Colors, Typography, Spacing)
-- ========================================
CREATE TABLE IF NOT EXISTS design_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  namespace TEXT NOT NULL UNIQUE,
  tokens JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE design_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_tokens_public_read" ON design_tokens
  FOR SELECT USING (TRUE);

CREATE POLICY "design_tokens_admin_write" ON design_tokens
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- CONTENT BLOCKS (Building blocks for pages)
-- ========================================
CREATE TABLE IF NOT EXISTS content_block_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  schema JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE content_block_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_block_types_public_read" ON content_block_types
  FOR SELECT USING (TRUE);

-- ========================================
-- PAGES (Composed of blocks)
-- ========================================
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  meta_description TEXT,
  og_image_id UUID,
  og_image_url TEXT,
  published BOOLEAN DEFAULT FALSE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pages_public_read" ON pages
  FOR SELECT USING (published = TRUE);

CREATE POLICY "pages_admin_crud" ON pages
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- PAGE BLOCKS (Instances on a page)
-- ========================================
CREATE TABLE IF NOT EXISTS page_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  data JSONB NOT NULL,
  position INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  scheduled_start TIMESTAMP,
  scheduled_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_id, position)
);

ALTER TABLE page_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_blocks_public_read" ON page_blocks
  FOR SELECT USING (
    active = TRUE AND
    (scheduled_start IS NULL OR scheduled_start <= CURRENT_TIMESTAMP) AND
    (scheduled_end IS NULL OR scheduled_end > CURRENT_TIMESTAMP)
  );

CREATE POLICY "page_blocks_admin_crud" ON page_blocks
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- NAVIGATION ITEMS (Menu builder)
-- ========================================
CREATE TABLE IF NOT EXISTS navigation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu TEXT NOT NULL,
  parent_id UUID REFERENCES navigation_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT,
  icon TEXT,
  badge_text TEXT,
  position INTEGER NOT NULL,
  open_in_new_tab BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "navigation_items_public_read" ON navigation_items
  FOR SELECT USING (active = TRUE);

CREATE POLICY "navigation_items_admin_crud" ON navigation_items
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- SETTINGS (Namespaced key/value configuration)
-- ========================================
CREATE TABLE IF NOT EXISTS settings (
  namespace TEXT NOT NULL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_public_read_safe" ON settings
  FOR SELECT USING (
    namespace NOT IN ('payment_providers', 'couriers', 'smtp', 'security')
  );

CREATE POLICY "settings_admin_all" ON settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- TRANSLATIONS (All UI strings/microcopy)
-- ========================================
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  locale TEXT NOT NULL,
  value TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(key, locale)
);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translations_public_read" ON translations
  FOR SELECT USING (TRUE);

CREATE POLICY "translations_admin_write" ON translations
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- CURRENCIES (Complete ISO 4217 list)
-- ========================================
CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL CHECK (decimals IN (0, 2, 3)),
  active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "currencies_public_read" ON currencies
  FOR SELECT USING (TRUE);

CREATE POLICY "currencies_admin_write" ON currencies
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- COUNTRIES (All ISO 3166-1 with subdivisions)
-- ========================================
CREATE TABLE IF NOT EXISTS countries (
  code VARCHAR(2) PRIMARY KEY,
  name TEXT NOT NULL,
  dial_code TEXT,
  active_for_shipping BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries_public_read" ON countries
  FOR SELECT USING (TRUE);

CREATE POLICY "countries_admin_write" ON countries
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- COUNTRY SUBDIVISIONS (States/provinces)
-- ========================================
CREATE TABLE IF NOT EXISTS country_subdivisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code VARCHAR(2) NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(country_code, code)
);

ALTER TABLE country_subdivisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subdivisions_public_read" ON country_subdivisions
  FOR SELECT USING (TRUE);

CREATE POLICY "subdivisions_admin_write" ON country_subdivisions
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- TAX RATES (By country/region)
-- ========================================
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code VARCHAR(2),
  subdivision_code TEXT,
  rate DECIMAL(5, 3) NOT NULL,
  inclusive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_rates_public_read" ON tax_rates
  FOR SELECT USING (TRUE);

CREATE POLICY "tax_rates_admin_write" ON tax_rates
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- PAYMENT PROVIDERS (Stripe, PayPal, COD, etc.)
-- ========================================
CREATE TABLE IF NOT EXISTS payment_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  test_mode BOOLEAN DEFAULT TRUE,
  credentials JSONB NOT NULL,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE payment_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_providers_admin_only" ON payment_providers
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- COURIERS (Shippo, FedEx, DHL, etc.)
-- ========================================
CREATE TABLE IF NOT EXISTS couriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  credentials JSONB NOT NULL,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couriers_admin_only" ON couriers
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- Create indexes for performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(published);
CREATE INDEX IF NOT EXISTS idx_page_blocks_page_id ON page_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_page_blocks_position ON page_blocks(position);
CREATE INDEX IF NOT EXISTS idx_navigation_items_menu ON navigation_items(menu);
CREATE INDEX IF NOT EXISTS idx_navigation_items_active ON navigation_items(active);
CREATE INDEX IF NOT EXISTS idx_translations_key_locale ON translations(key, locale);
CREATE INDEX IF NOT EXISTS idx_currencies_active ON currencies(active);
CREATE INDEX IF NOT EXISTS idx_countries_shipping ON countries(active_for_shipping);
CREATE INDEX IF NOT EXISTS idx_payment_providers_enabled ON payment_providers(enabled);
CREATE INDEX IF NOT EXISTS idx_couriers_enabled ON couriers(enabled);
