-- =============================================================================
-- SmartVendor AI (OmniSell AI) — Supabase / PostgreSQL schema
-- Enables pgvector for semantic product matching and defines the core
-- multi-tenant commerce model: merchants -> products -> carts -> cart_items.
-- Run this once against a fresh Supabase project (SQL editor or `supabase db push`).
-- =============================================================================

create extension if not exists vector;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- merchants
-- One row per tenant/store. Holds per-channel credentials so the webhook
-- layer can resolve an inbound message to the right merchant + AI context.
-- ---------------------------------------------------------------------------
create table if not exists merchants (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text not null unique,
  default_currency   text not null default 'DZD',
  whatsapp_phone_id  text unique,          -- WhatsApp Cloud API phone_number_id
  whatsapp_token     text,                 -- encrypted at rest via Supabase Vault in production
  instagram_page_id  text unique,
  messenger_page_id  text unique,
  tiktok_shop_id     text unique,
  page_access_token  text,                 -- shared Meta Graph API token for IG/Messenger
  webhook_verify_token text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_merchants_whatsapp_phone_id on merchants (whatsapp_phone_id);
create index if not exists idx_merchants_instagram_page_id on merchants (instagram_page_id);
create index if not exists idx_merchants_messenger_page_id on merchants (messenger_page_id);

-- ---------------------------------------------------------------------------
-- products
-- embedding is a 768-dim vector (Gemini text-embedding-004 output size) used
-- for semantic matching between a customer's free-text/voice/image request
-- and the merchant's catalog.
-- ---------------------------------------------------------------------------
create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null references merchants (id) on delete cascade,
  sku           text,
  name          text not null,
  description   text,
  image_url     text,
  price         numeric(12, 2) not null default 0,
  currency      text not null default 'DZD',
  stock_qty     integer not null default 0,
  options       jsonb not null default '{}'::jsonb, -- e.g. {"color": ["red","blue"], "size": ["M","L"]}
  is_active     boolean not null default true,
  embedding     vector(768),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_products_merchant_id on products (merchant_id);
create index if not exists idx_products_is_active on products (is_active);
-- Approximate nearest-neighbour index for cosine similarity search.
create index if not exists idx_products_embedding_ivfflat
  on products using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------------------------
-- carts
-- One cart per checkout session/conversation. Created by the AI pipeline
-- after it extracts a structured order; the customer confirms it on the
-- Micro-PWA checkout page, at which point status flips to 'confirmed'.
-- ---------------------------------------------------------------------------
create type cart_channel as enum ('whatsapp', 'instagram', 'messenger', 'tiktok', 'web');
create type cart_status as enum ('open', 'pending_confirmation', 'confirmed', 'abandoned', 'cancelled');
create type payment_method as enum ('cod', 'online', 'bank_transfer');

create table if not exists carts (
  id                uuid primary key default gen_random_uuid(),
  merchant_id       uuid not null references merchants (id) on delete cascade,
  channel           cart_channel not null,
  channel_thread_id text not null, -- sender/conversation id on the origin channel
  status            cart_status not null default 'open',
  customer_name     text,
  customer_phone    text,
  customer_city     text,
  customer_address  text,
  payment_method    payment_method not null default 'cod',
  currency          text not null default 'DZD',
  subtotal          numeric(12, 2) not null default 0,
  shipping_fee      numeric(12, 2) not null default 0,
  total             numeric(12, 2) not null default 0,
  ai_raw_extraction jsonb, -- full Gemini structured-output payload, for audit/debug
  source_message    text,  -- transcribed / OCR'd original customer text
  confirmed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_carts_merchant_id on carts (merchant_id);
create index if not exists idx_carts_status on carts (status);
create index if not exists idx_carts_channel_thread on carts (channel, channel_thread_id);

-- ---------------------------------------------------------------------------
-- cart_items
-- ---------------------------------------------------------------------------
create table if not exists cart_items (
  id             uuid primary key default gen_random_uuid(),
  cart_id        uuid not null references carts (id) on delete cascade,
  product_id     uuid references products (id) on delete set null,
  name_snapshot  text not null,   -- product name at time of add, survives product deletion
  image_snapshot text,
  unit_price     numeric(12, 2) not null default 0,
  quantity       integer not null default 1 check (quantity > 0),
  selected_options jsonb not null default '{}'::jsonb,
  match_score    real, -- cosine similarity score from vector search, for QA
  created_at     timestamptz not null default now()
);

create index if not exists idx_cart_items_cart_id on cart_items (cart_id);

-- ---------------------------------------------------------------------------
-- keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_merchants_updated_at on merchants;
create trigger trg_merchants_updated_at before update on merchants
  for each row execute function set_updated_at();

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

drop trigger if exists trg_carts_updated_at on carts;
create trigger trg_carts_updated_at before update on carts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- keep cart totals in sync whenever items change
-- ---------------------------------------------------------------------------
create or replace function recalc_cart_totals()
returns trigger language plpgsql as $$
declare
  target_cart_id uuid := coalesce(new.cart_id, old.cart_id);
  new_subtotal numeric(12, 2);
begin
  select coalesce(sum(unit_price * quantity), 0) into new_subtotal
  from cart_items where cart_id = target_cart_id;

  update carts
  set subtotal = new_subtotal,
      total = new_subtotal + shipping_fee
  where id = target_cart_id;

  return null;
end;
$$;

drop trigger if exists trg_cart_items_recalc on cart_items;
create trigger trg_cart_items_recalc
  after insert or update or delete on cart_items
  for each row execute function recalc_cart_totals();

-- ---------------------------------------------------------------------------
-- RPC: match_products
-- Cosine-similarity search over a merchant's active catalog. Called by the
-- AI pipeline's vector search step (services/vectorSearch.ts).
-- ---------------------------------------------------------------------------
create or replace function match_products(
  query_embedding vector(768),
  match_merchant_id uuid,
  match_threshold float default 0.72,
  match_count int default 5
)
returns table (
  id uuid,
  name text,
  description text,
  image_url text,
  price numeric,
  currency text,
  stock_qty integer,
  options jsonb,
  similarity float
)
language sql stable as $$
  select
    p.id,
    p.name,
    p.description,
    p.image_url,
    p.price,
    p.currency,
    p.stock_qty,
    p.options,
    1 - (p.embedding <=> query_embedding) as similarity
  from products p
  where p.merchant_id = match_merchant_id
    and p.is_active = true
    and p.embedding is not null
    and 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security — service role (used by the backend) bypasses RLS by
-- default; these policies protect the tables if the anon/public key is ever
-- used directly (e.g. from the checkout PWA reading its own cart).
-- ---------------------------------------------------------------------------
alter table merchants enable row level security;
alter table products enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;

drop policy if exists "public can read active products" on products;
create policy "public can read active products" on products
  for select using (is_active = true);

drop policy if exists "public can read own cart" on carts;
create policy "public can read own cart" on carts
  for select using (true); -- cart id (uuid) acts as the shared secret in the checkout URL

drop policy if exists "public can read own cart items" on cart_items;
create policy "public can read own cart items" on cart_items
  for select using (true);
