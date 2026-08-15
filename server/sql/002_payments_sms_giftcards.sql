-- Migration 002: live payment gateways, SMS, image variants, gift cards,
-- couriers. Safe to run more than once.

-- ---------------------------------------------------------------- payments ---

alter table payments add column if not exists capture_reference text;
alter table payments add column if not exists captured_at timestamptz;
alter table payments add column if not exists raw jsonb;

-- One row per gateway reference, so a webhook retry cannot create a duplicate.
-- 001 created this column as `reference`, but every gateway code path writes
-- `provider_reference`. Add the column the code expects and carry over any
-- values already stored under the old name.
alter table payments add column if not exists provider_reference text;
update payments
   set provider_reference = reference
 where provider_reference is null
   and reference is not null;

create unique index if not exists payments_provider_reference_key
  on payments (provider, provider_reference)
  where provider_reference is not null;

alter table orders add column if not exists capture_reference text;
alter table orders add column if not exists paid_at timestamptz;
alter table orders add column if not exists presentment_currency text;

create index if not exists orders_payment_reference_idx
  on orders (payment_reference) where payment_reference is not null;
create index if not exists orders_capture_reference_idx
  on orders (capture_reference) where capture_reference is not null;
create index if not exists orders_paid_at_idx on orders (paid_at);

-- Every webhook we have already handled. The unique key is the whole point:
-- gateways retry aggressively and we must process each event exactly once.
create table if not exists webhook_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text        not null,
  event_id     text        not null,
  event_type   text,
  received_at  timestamptz not null default now(),
  unique (provider, event_id)
);

create index if not exists webhook_events_received_idx on webhook_events (received_at);

-- -------------------------------------------------------------------- SMS ---

create table if not exists sms_log (
  id          uuid primary key default gen_random_uuid(),
  provider    text        not null,
  recipient   text        not null,
  body        text        not null,
  status      text        not null default 'sent',
  error       text,
  message_id  text,
  order_id    uuid references orders (id) on delete set null,
  kind        text        not null default 'manual',
  created_at  timestamptz not null default now()
);

create index if not exists sms_log_created_idx on sms_log (created_at desc);
create index if not exists sms_log_order_idx on sms_log (order_id);

-- ----------------------------------------------------------------- images ---

alter table media add column if not exists lqip text;
alter table media add column if not exists width integer;
alter table media add column if not exists height integer;
alter table media add column if not exists format text;

-- ------------------------------------------------------------- gift cards ---

create table if not exists gift_cards (
  id              uuid primary key default gen_random_uuid(),
  -- Codes are stored as an HMAC. A stolen dump is not spendable.
  code_hash       text        not null unique,
  code_last4      text        not null,
  initial_minor   integer     not null check (initial_minor > 0),
  balance_minor   integer     not null check (balance_minor >= 0),
  currency        text        not null,
  status          text        not null default 'active'
                    check (status in ('active','redeemed','disabled','expired')),
  expires_at      timestamptz,
  recipient_email text,
  note            text,
  issued_by       text,
  order_id        uuid references orders (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists gift_cards_status_idx on gift_cards (status);
create index if not exists gift_cards_created_idx on gift_cards (created_at desc);

-- Append-only ledger: the balance column is a convenience, this is the truth.
create table if not exists gift_card_transactions (
  id                  uuid primary key default gen_random_uuid(),
  gift_card_id        uuid not null references gift_cards (id) on delete cascade,
  kind                text not null
                        check (kind in ('issue','redeem','restore','adjust','disable','enable')),
  amount_minor        integer     not null,
  balance_after_minor integer     not null,
  order_id            uuid references orders (id) on delete set null,
  actor               text,
  note                text,
  created_at          timestamptz not null default now()
);

create index if not exists gift_card_tx_card_idx on gift_card_transactions (gift_card_id, created_at);

create table if not exists gift_card_redemptions (
  gift_card_id uuid not null references gift_cards (id) on delete cascade,
  order_id     uuid not null references orders (id) on delete cascade,
  amount_minor integer not null,
  restored_at  timestamptz,
  created_at   timestamptz not null default now(),
  primary key (gift_card_id, order_id)
);

alter table orders add column if not exists gift_card_minor integer not null default 0;

-- --------------------------------------------------------------- couriers ---

create table if not exists shipment_labels (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders (id) on delete cascade,
  provider       text not null,
  provider_ref   text,
  tracking_number text,
  tracking_url   text,
  label_url      text,
  service        text,
  cost_minor     integer,
  currency       text,
  status         text not null default 'created',
  raw            jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists shipment_labels_order_idx on shipment_labels (order_id);

create table if not exists tracking_events (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders (id) on delete cascade,
  provider      text not null,
  status        text,
  description   text,
  location      text,
  occurred_at   timestamptz,
  fingerprint   text not null,
  created_at    timestamptz not null default now(),
  unique (order_id, fingerprint)
);

create index if not exists tracking_events_order_idx on tracking_events (order_id, occurred_at desc);
