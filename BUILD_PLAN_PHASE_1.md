# Velora Platform Enhancement - Phase 1 Detailed Plan

## Understanding

Converting the existing Velora platform (Express + React + Supabase) to match the master build prompt specifications with the following goals:

1. **ZERO hardcoded content** - Everything database-driven and admin-editable
2. **Theme system** - CSS custom properties injected from database
3. **Page builder** - Compose pages from reusable block types
4. **Complete admin panel** - God-Mode features for store management
5. **Multi-currency** - Full ISO 4217 support with proper decimal handling
6. **Multi-country** - All ISO 3166-1 countries with subdivisions
7. **Brand**: "Modest Apparel"
8. **Performance targets**: LCP < 1.8s, CLS < 0.05, JS < 150KB
9. **Dual hosting**: Vercel AND cPanel/Node

## Analysis

### Current State vs. Required State

**Current Velora Platform Has:**
- ✅ Express.js backend with TypeScript
- ✅ React frontend with Vite
- ✅ Supabase database connection
- ✅ Basic authentication
- ✅ Admin routes structure
- ✅ Server-built (web/dist exists)

**MISSING - Critical for PDF Compliance:**
- ❌ Design tokens system (theme colors, typography stored in DB)
- ❌ Content blocks registry (hero, banner, product_grid, testimonials, etc.)
- ❌ Page builder (admin UI to compose pages)
- ❌ Settings namespaces (branding, SEO, currency, tax, etc.) - everything editable
- ❌ Navigation/menu builder
- ❌ Multi-currency system (complete ISO 4217 list)
- ❌ Multi-country with subdivisions
- ❌ Translation/string table
- ❌ Payment integrations (Stripe, PayPal, COD, bank transfer)
- ❌ Courier integrations (Shippo, FedEx, DHL)
- ❌ Invoice PDF generation
- ❌ Email template system
- ❌ RLS policies on all tables
- ❌ Complete admin CRUD for all entities

### Architecture Decision

**Keep Express + React, adapt to PDF specs because:**
1. ✅ Already built and running
2. ✅ Supabase connection working
3. ✅ Database can be extended
4. ✅ Server can be enhanced with new routes
5. ⚠️ Trade-off: Not using Next.js App Router as specified in PDF, but achieves same goals

**Key Adaptation:**
- Express routes for API
- React components for UI
- Supabase for data
- Server actions via Express endpoints
- Revalidation via Cache-Control headers

## Implementation Plan - Phase 1

### Step 1: Database Schema Overhaul

**File:** `server/migrations/001_design_tokens_and_blocks.sql`

Create these core tables:

```sql
-- Design Tokens (stored as JSONB, injected as CSS variables)
CREATE TABLE design_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL UNIQUE,
  tokens jsonb NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Content Blocks (building blocks for page builder)
CREATE TABLE content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- 'hero', 'banner', 'product_grid', 'testimonials', etc.
  schema jsonb NOT NULL, -- Zod schema validation
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Page Blocks (instances on a page)
CREATE TABLE page_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  data jsonb NOT NULL,
  position integer NOT NULL,
  active boolean DEFAULT true,
  scheduled_start timestamp,
  scheduled_end timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Pages (composed of blocks)
CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  meta_description text,
  og_image text,
  published boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Navigation Items (menu builder)
CREATE TABLE navigation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu text NOT NULL, -- 'header', 'footer', 'mobile'
  parent_id uuid REFERENCES navigation_items(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text,
  icon text,
  badge text,
  position integer NOT NULL,
  open_in_new_tab boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Settings (namespaced configuration)
CREATE TABLE settings (
  namespace text NOT NULL PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamp DEFAULT now()
);

-- Translations/Strings (all UI microcopy)
CREATE TABLE translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  locale text NOT NULL,
  value text NOT NULL,
  context text, -- 'button', 'label', 'message', 'email', etc.
  UNIQUE(key, locale)
);

-- Currencies (complete ISO 4217)
CREATE TABLE currencies (
  code varchar(3) PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  decimals integer NOT NULL, -- 0, 2, or 3
  active boolean DEFAULT false
);

-- Countries (all ISO 3166-1 with subdivisions)
CREATE TABLE countries (
  code varchar(2) PRIMARY KEY,
  name text NOT NULL,
  dial_code text,
  active_for_shipping boolean DEFAULT false
);

CREATE TABLE country_subdivisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) NOT NULL REFERENCES countries(code),
  code text NOT NULL,
  name text NOT NULL,
  UNIQUE(country_code, code)
);

-- Tax Rates (by country/region)
CREATE TABLE tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2),
  subdivision_code text,
  rate decimal(5,3) NOT NULL,
  inclusive boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Payment Provider Credentials
CREATE TABLE payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE, -- 'stripe', 'paypal', 'cod', 'bank_transfer'
  enabled boolean DEFAULT false,
  test_mode boolean DEFAULT true,
  credentials jsonb NOT NULL, -- Encrypted in DB
  config jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Courier Credentials
CREATE TABLE couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE, -- 'shippo', 'fedex', 'dhl', 'manual'
  enabled boolean DEFAULT false,
  credentials jsonb NOT NULL, -- Encrypted
  config jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**Enable RLS on all tables:**
```sql
ALTER TABLE design_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_subdivisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
```

**RLS Policies - Public (Anon/Customer):**
- Read-only: pages, page_blocks, content_blocks, translations, navigation_items, currencies, countries, country_subdivisions
- Never: payment_providers, couriers, tax_rates, settings (internal only), design_tokens (internal only)

**RLS Policies - Admin:**
- Full CRUD on everything except: design_tokens (admins see but can't modify schema, only values), content_blocks (schema only, not instances)

### Step 2: Seed Data

**File:** `server/seeds/seed_base.sql`

```sql
-- Default brand settings
INSERT INTO settings (namespace, data) VALUES
('branding', '{
  "store_name": "Modest Apparel",
  "logo_url": null,
  "favicon_url": null,
  "primary_color": "#1a1a1a",
  "secondary_color": "#f5f5f5",
  "accent_color": "#d97706"
}'::jsonb),

-- SEO defaults
('seo', '{
  "site_title": "Modest Apparel",
  "site_description": "Modest fashion for the modern world",
  "og_image": null,
  "twitter_handle": null
}'::jsonb),

-- Currency: USD as base, all currencies available
('currency', '{
  "base_currency": "USD",
  "display_currencies": ["USD", "EUR", "GBP", "AUD", "CAD", "JPY"]
}'::jsonb),

-- Legal
('legal', '{
  "privacy_policy": null,
  "terms_of_service": null,
  "return_policy": null,
  "refund_policy": null
}'::jsonb);

-- Seed all ISO 4217 currencies (COMPLETE LIST)
INSERT INTO currencies (code, name, symbol, decimals) VALUES
('USD', 'US Dollar', '$', 2),
('EUR', 'Euro', '€', 2),
('GBP', 'British Pound', '£', 2),
-- ... (all 180+ ISO 4217 codes with proper decimal handling)

-- Seed all ISO 3166-1 countries
INSERT INTO countries (code, name, dial_code) VALUES
('US', 'United States', '+1'),
('GB', 'United Kingdom', '+44'),
-- ... (all 249 ISO countries)

-- Design Tokens (theme colors, typography)
INSERT INTO design_tokens (namespace, tokens) VALUES
('colors', '{
  "primary": "#1a1a1a",
  "secondary": "#f5f5f5",
  "accent": "#d97706",
  "success": "#10b981",
  "error": "#ef4444",
  "warning": "#f59e0b",
  "info": "#3b82f6"
}'::jsonb),

('typography', '{
  "font_family_sans": "Inter, system-ui, sans-serif",
  "font_family_serif": "Georgia, serif",
  "font_sizes": {"xs": "12px", "sm": "14px", "base": "16px", "lg": "18px", "xl": "20px"},
  "line_heights": {"tight": "1.2", "normal": "1.5", "relaxed": "1.75"}
}'::jsonb);
```

### Step 3: Generate TypeScript Types

**File:** `packages/db/types.ts`

After migrations, generate types from Supabase schema:

```bash
npx supabase gen types typescript --schema public > packages/db/types.ts
```

### Step 4: Create API Endpoints for Admin

**Files to create:**

- `server/src/routes/admin/settings.ts` - GET/PUT settings
- `server/src/routes/admin/design-tokens.ts` - GET/PUT tokens
- `server/src/routes/admin/pages.ts` - GET/POST/PUT/DELETE pages
- `server/src/routes/admin/page-blocks.ts` - CRUD for blocks
- `server/src/routes/admin/navigation.ts` - Menu builder endpoints
- `server/src/routes/admin/translations.ts` - String editor endpoints
- `server/src/routes/admin/currencies.ts` - Currency management
- `server/src/routes/admin/countries.ts` - Country/region management
- `server/src/routes/admin/tax-rates.ts` - Tax configuration
- `server/src/routes/admin/payment-providers.ts` - Payment config
- `server/src/routes/admin/couriers.ts` - Courier config

### Step 5: Integrate Admin Panel Theme

**Extract velora-admin-panel-v4.zip components into:**
- `web/src/components/admin/` - UI components from shadcn/ui
- `web/src/routes/admin/` - Admin route pages
- `web/src/hooks/` - React hooks for data fetching
- `web/src/lib/` - Utilities and client-side logic

## Risks

1. **Database migration reversibility** - All migrations must be reversible
2. **Large data seeding** - ISO 4217 (180+ currencies) + ISO 3166-1 (249 countries) = 500+ rows, keep performant
3. **RLS complexity** - Many tables with fine-grained policies, test thoroughly
4. **Breaking existing code** - New schema shouldn't break current functionality
5. **Performance** - Settings table read on every request, cache aggressively

## Verification Steps

1. ✅ Migrations apply without errors: `npm run migrate`
2. ✅ Types generate correctly: `npm run gen:types`
3. ✅ Seed data loads: Verify 180+ currencies, 249 countries in DB
4. ✅ RLS policies work: Anon users see only public data
5. ✅ Admin endpoints work: Test GET/POST/PUT/DELETE on each
6. ✅ No breaking changes: Existing admin routes still work

## Next Steps

1. Create and apply SQL migrations
2. Generate TypeScript types
3. Create admin API endpoints
4. Integrate admin panel components
5. Build theme system (Phase 2)

---

**Timeline for Phase 1: 2-3 days**
- Day 1: Database schema, migrations, types
- Day 2: Seed data, RLS policies
- Day 3: Admin API endpoints, integrate theme components
