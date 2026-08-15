-- =====================================================================
-- Velora Commerce Platform — full schema (PostgreSQL / Supabase)
-- Money is ALWAYS stored as integer minor units in the store base currency.
-- Run once:  psql "$DATABASE_URL" -f server/sql/001_schema.sql
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- settings (namespace/key/value) ----------------------------
create table if not exists settings (
  namespace   text not null,
  key         text not null,
  value       jsonb not null default 'null'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (namespace, key)
);

-- ---------- admin users / auth ----------------------------------------
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text not null,
  password_hash text not null,
  role          text not null default 'staff',
  overrides     jsonb not null default '[]'::jsonb,
  status        text not null default 'active',
  avatar_url    text,
  failed_attempts int not null default 0,
  locked_until  timestamptz,
  last_login_at timestamptz,
  must_change_password boolean not null default false,
  totp_secret   text,
  created_at    timestamptz not null default now()
);

create table if not exists admin_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references admin_users(id) on delete cascade,
  token_hash  text not null unique,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz
);
create index if not exists admin_sessions_user_idx on admin_sessions(user_id);

create table if not exists login_attempts (
  id         bigserial primary key,
  email      text not null,
  ip         text,
  ok         boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_email_idx on login_attempts(email, created_at desc);

create table if not exists rate_limits (
  bucket     text not null,
  ip         text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limits_idx on rate_limits(bucket, ip, created_at desc);

create table if not exists audit_log (
  id         bigserial primary key,
  actor_id   uuid references admin_users(id) on delete set null,
  actor_name text,
  action     text not null,
  entity     text,
  ip         text,
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log(created_at desc);

-- ---------- media ------------------------------------------------------
create table if not exists media (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  alt         text not null default '',
  filename    text,
  mime        text,
  bytes       bigint,
  width       int,
  height      int,
  folder      text not null default 'misc',
  created_at  timestamptz not null default now()
);

-- ---------- catalogue --------------------------------------------------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text default '',
  parent_id   uuid references categories(id) on delete set null,
  image_id    uuid references media(id) on delete set null,
  position    int not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  subtitle      text default '',
  description   text default '',
  status        text not null default 'draft',      -- draft | active | archived
  price_minor   bigint not null default 0,           -- base currency minor units
  compare_at_minor bigint,
  cost_minor    bigint,
  currency      text not null default 'GBP',         -- currency the admin typed
  sku           text,
  barcode       text,
  track_stock   boolean not null default true,
  stock         int not null default 0,
  low_stock_at  int not null default 5,
  weight_grams  int not null default 0,
  tax_class     text not null default 'standard',
  featured      boolean not null default false,
  rating_override numeric(3,2),
  review_count_override int,
  seo_title     text,
  seo_description text,
  tags          jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists products_status_idx on products(status);

create table if not exists product_categories (
  product_id  uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table if not exists product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  media_id   uuid not null references media(id) on delete cascade,
  position   int not null default 0
);

create table if not exists product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  title       text not null default 'Default',
  options     jsonb not null default '{}'::jsonb,   -- {"Size":"M","Colour":"Black"}
  sku         text,
  price_minor bigint,                                -- null = inherit product
  stock       int not null default 0,
  position    int not null default 0
);
create index if not exists product_variants_product_idx on product_variants(product_id);

create table if not exists product_reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  author     text not null,
  email      text,
  rating     int not null check (rating between 1 and 5),
  title      text,
  body       text,
  state      text not null default 'pending',       -- pending | published | rejected
  created_at timestamptz not null default now()
);

-- ---------- currency ---------------------------------------------------
create table if not exists currencies (
  code       text primary key,
  symbol     text not null,
  decimals   int not null default 2,
  enabled    boolean not null default true,
  rounding   text not null default 'none',          -- none | 0.99 | 0.95 | whole
  position   int not null default 0
);

create table if not exists exchange_rates (
  base       text not null,
  quote      text not null,
  rate       numeric(20,10) not null,
  source     text not null default 'manual',
  fetched_at timestamptz not null default now(),
  primary key (base, quote)
);

create table if not exists country_currency (
  country   text primary key,   -- ISO-3166 alpha-2
  currency  text not null
);

-- ---------- customers --------------------------------------------------
create table if not exists customers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text not null default '',
  phone         text,
  password_hash text,
  accepts_marketing boolean not null default false,
  status        text not null default 'active',
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  label       text,
  name        text,
  line1       text,
  line2       text,
  city        text,
  region      text,
  postcode    text,
  country     text,
  phone       text,
  is_default  boolean not null default false
);

-- ---------- discounts --------------------------------------------------
create table if not exists coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  type          text not null default 'percent',   -- percent | fixed | free_shipping
  value         numeric(12,2) not null default 0,
  min_spend_minor bigint not null default 0,
  usage_limit   int,
  used_count    int not null default 0,
  per_customer_limit int,
  starts_at     timestamptz,
  ends_at       timestamptz,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references coupons(id) on delete cascade,
  order_id    uuid,
  customer_id uuid,
  created_at  timestamptz not null default now()
);

-- ---------- shipping / tax --------------------------------------------
create table if not exists shipping_zones (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  countries jsonb not null default '[]'::jsonb,
  position  int not null default 0
);

create table if not exists shipping_rates (
  id            uuid primary key default gen_random_uuid(),
  zone_id       uuid not null references shipping_zones(id) on delete cascade,
  name          text not null,
  price_minor   bigint not null default 0,
  free_over_minor bigint,
  min_days      int,
  max_days      int,
  active        boolean not null default true
);

create table if not exists tax_rates (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  country   text,
  region    text,
  rate      numeric(6,3) not null default 0,
  tax_class text not null default 'standard',
  inclusive boolean not null default true
);

-- ---------- carts ------------------------------------------------------
create table if not exists carts (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,
  customer_id uuid references customers(id) on delete set null,
  email       text,
  currency    text,
  items       jsonb not null default '[]'::jsonb,
  abandoned_email_sent_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- orders -----------------------------------------------------
create sequence if not exists order_number_seq start 1;
create sequence if not exists invoice_number_seq start 1;

create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  number            text not null unique,
  customer_id       uuid references customers(id) on delete set null,
  email             text not null,
  phone             text,
  status            text not null default 'pending',
  payment_status    text not null default 'unpaid',
  fulfillment_status text not null default 'unfulfilled',
  currency          text not null,              -- currency the customer paid in
  fx_rate           numeric(20,10) not null default 1,  -- base -> presentment
  subtotal_minor    bigint not null default 0,  -- all *_minor are BASE currency
  discount_minor    bigint not null default 0,
  shipping_minor    bigint not null default 0,
  tax_minor         bigint not null default 0,
  total_minor       bigint not null default 0,
  coupon_code       text,
  payment_method    text,
  payment_reference text,
  shipping_address  jsonb,
  billing_address   jsonb,
  shipping_method   text,
  tracking_number   text,
  tracking_url      text,
  courier           text,
  customer_note     text,
  staff_note        text,
  cancelled_reason  text,
  placed_at         timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists orders_placed_idx on orders(placed_at desc);
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_email_idx on orders(email);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  variant_id  uuid references product_variants(id) on delete set null,
  title       text not null,
  variant_title text,
  sku         text,
  image_url   text,
  qty         int not null default 1,
  unit_price_minor bigint not null default 0,
  total_minor bigint not null default 0
);
create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists order_status_history (
  id         bigserial primary key,
  order_id   uuid not null references orders(id) on delete cascade,
  field      text not null,
  from_value text,
  to_value   text,
  note       text,
  actor      text,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  number     text not null unique,
  issued_at  timestamptz not null default now(),
  total_minor bigint not null default 0,
  currency   text not null
);

create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  provider    text not null,
  reference   text,
  amount_minor bigint not null default 0,
  currency    text not null,
  status      text not null default 'pending',
  raw         jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists refunds (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  amount_minor bigint not null default 0,
  reason      text,
  actor       text,
  created_at  timestamptz not null default now()
);

-- ---------- content ----------------------------------------------------
create table if not exists banners (
  id          uuid primary key default gen_random_uuid(),
  placement   text not null default 'hero',   -- hero | promo | announcement | strip
  title       text default '',
  subtitle    text default '',
  body        text default '',
  cta_label   text default '',
  cta_href    text default '',
  media_id    uuid references media(id) on delete set null,
  image_url   text,
  bg_color    text,
  text_color  text,
  position    int not null default 0,
  active      boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists banners_placement_idx on banners(placement, position);

create table if not exists pages (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      text not null,
  body       text not null default '',
  seo_title  text,
  seo_description text,
  published  boolean not null default true,
  system     boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists navigation_items (
  id       uuid primary key default gen_random_uuid(),
  menu     text not null default 'header',   -- header | footer-1 | footer-2 ...
  label    text not null,
  href     text not null,
  parent_id uuid references navigation_items(id) on delete cascade,
  position int not null default 0,
  visible  boolean not null default true
);

create table if not exists testimonials (
  id       uuid primary key default gen_random_uuid(),
  author   text not null,
  role     text,
  body     text not null,
  rating   int default 5,
  avatar_url text,
  position int not null default 0,
  active   boolean not null default true
);

-- ---------- messaging --------------------------------------------------
create table if not exists email_templates (
  key        text primary key,
  subject    text not null,
  body_html  text not null,
  enabled    boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists email_log (
  id         bigserial primary key,
  to_email   text not null,
  subject    text,
  template   text,
  status     text not null default 'sent',
  error      text,
  created_at timestamptz not null default now()
);

create table if not exists newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  status     text not null default 'subscribed',
  source     text,
  created_at timestamptz not null default now()
);

create table if not exists contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text,
  body       text not null,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists stock_notifications (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  email      text not null,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- admin notification bell ------------------------------------
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,               -- order.placed | stock.low | contact.new ...
  title      text not null,
  body       text,
  href       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_created_idx on notifications(created_at desc);

-- ---------- misc -------------------------------------------------------
create table if not exists redirects (
  id     uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path   text not null,
  code      int not null default 301
);

create table if not exists jobs (
  id         bigserial primary key,
  kind       text not null,
  payload    jsonb not null default '{}'::jsonb,
  run_after  timestamptz not null default now(),
  attempts   int not null default 0,
  done_at    timestamptz,
  error      text,
  created_at timestamptz not null default now()
);
